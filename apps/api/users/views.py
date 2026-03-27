from __future__ import annotations

import json
import logging
import re
import secrets
from time import perf_counter
from urllib import parse as urllib_parse
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.middleware.csrf import get_token
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from common.observability import log_timed_event
from users.models import User
from users.serializers import (
    EmailVerificationConfirmSerializer,
    GoogleAuthSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    UserMeSerializer,
)

logger = logging.getLogger(__name__)

EMAIL_VERIFICATION_SALT = "users.email_verification"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not settings.DEBUG and not settings.TESTING,
        samesite="Lax",
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        path="/api/v1/auth",
    )


def _ensure_csrf_cookie(request, response: Response) -> Response:
    get_token(request)
    return response


def _client_ip(request) -> str:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _login_failure_key(email: str, ip_address: str) -> str:
    return f"auth:login_fail:{email}:{ip_address}"


def _is_login_locked(key: str) -> bool:
    return int(cache.get(key, 0)) >= settings.AUTH_LOGIN_FAILURE_LIMIT


def _record_login_failure(key: str) -> int:
    attempts = int(cache.get(key, 0)) + 1
    cache.set(key, attempts, timeout=settings.AUTH_LOGIN_FAILURE_TTL_SECONDS)
    return attempts


def _clear_login_failures(key: str) -> None:
    cache.delete(key)


def _require_csrf_for_cookie_flow(request) -> None:
    cookie_token = request.COOKIES.get(settings.CSRF_COOKIE_NAME, "")
    header_token = (
        request.headers.get("X-CSRFToken")
        or request.headers.get("X-CSRF-Token")
        or request.META.get("HTTP_X_CSRFTOKEN")
        or request.META.get("HTTP_X_CSRF_TOKEN")
        or ""
    )
    if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
        raise ValidationError({"detail": "CSRF token missing or invalid for cookie-based auth request."})


def _generate_email_verification_token(user: User) -> str:
    payload = {"user_id": str(user.id), "email": user.email}
    return signing.dumps(payload, salt=EMAIL_VERIFICATION_SALT)


def _decode_email_verification_token(token: str) -> dict:
    try:
        return signing.loads(
            token,
            salt=EMAIL_VERIFICATION_SALT,
            max_age=settings.EMAIL_VERIFICATION_TOKEN_MAX_AGE_SECONDS,
        )
    except signing.BadSignature as exc:
        raise ValidationError({"detail": "Invalid or expired email verification token."}) from exc


def _normalize_username(seed: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9_]", "", seed.lower())[:42]
    return normalized or "player"


def _generate_unique_username(seed: str) -> str:
    base = _normalize_username(seed)
    candidate = base
    index = 1
    while User.objects.filter(username=candidate).exists():
        suffix = f"_{index}"
        candidate = f"{base[:50 - len(suffix)]}{suffix}"
        index += 1
    return candidate


def _verify_google_id_token(id_token: str) -> dict:
    query = urllib_parse.urlencode({"id_token": id_token})
    verify_url = f"https://oauth2.googleapis.com/tokeninfo?{query}"

    try:
        with urlopen(verify_url, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as exc:
        raise ValidationError({"detail": "Unable to verify Google token at this time."}) from exc

    audience = payload.get("aud")
    configured_client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if configured_client_id and audience != configured_client_id:
        raise ValidationError({"detail": "Google token audience mismatch."})

    email = payload.get("email")
    email_verified = str(payload.get("email_verified", "")).lower() == "true"
    if not email or not email_verified:
        raise ValidationError({"detail": "Google account email is not verified."})
    return payload


def _upsert_google_user(payload: dict) -> User:
    email = payload["email"].strip().lower()
    user = User.objects.filter(email=email).first()
    picture = payload.get("picture", "")

    if user:
        update_fields = []
        if user.oauth_provider != User.OAuthProvider.GOOGLE:
            user.oauth_provider = User.OAuthProvider.GOOGLE
            update_fields.append("oauth_provider")
        if not user.is_verified:
            user.is_verified = True
            update_fields.append("is_verified")
        if picture and user.avatar_url != picture:
            user.avatar_url = picture
            update_fields.append("avatar_url")
        if update_fields:
            user.save(update_fields=update_fields)
        return user

    username_seed = payload.get("name") or email.split("@", maxsplit=1)[0]
    username = _generate_unique_username(username_seed)
    return User.objects.create_user(
        email=email,
        username=username,
        password=None,
        oauth_provider=User.OAuthProvider.GOOGLE,
        avatar_url=picture,
        is_verified=True,
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        started_at = perf_counter()
        response = super().create(request, *args, **kwargs)
        user = User.objects.get(email=response.data["email"])
        refresh = RefreshToken.for_user(user)
        verification_token = _generate_email_verification_token(user)

        logger.info(
            "user_registered",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(user.id),
            },
        )

        payload = {
            "user": UserMeSerializer(user).data,
            "access": str(refresh.access_token),
            "email_verification_required": not user.is_verified,
        }
        if settings.DEBUG or settings.TESTING:
            payload["verification_token"] = verification_token

        response_payload = Response(payload, status=status.HTTP_201_CREATED)
        _set_refresh_cookie(response_payload, str(refresh))
        log_timed_event(
            logger,
            "register_completed",
            request,
            started_at,
            created_user_id=str(user.id),
        )
        return _ensure_csrf_cookie(request, response_payload)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        started_at = perf_counter()
        email = (request.data.get("email") or "").strip().lower()
        ip_address = _client_ip(request)
        failure_key = _login_failure_key(email=email, ip_address=ip_address)

        if email and _is_login_locked(failure_key):
            logger.warning(
                "login_blocked_lockout",
                extra={
                    "request_id": getattr(request, "request_id", None),
                    "email": email,
                    "ip_address": ip_address,
                },
            )
            return Response(
                {"detail": "Too many failed login attempts. Try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            response = super().post(request, *args, **kwargs)
        except APIException:
            if email:
                attempts = _record_login_failure(failure_key)
                logger.warning(
                    "login_failed",
                    extra={
                        "request_id": getattr(request, "request_id", None),
                        "email": email,
                        "ip_address": ip_address,
                        "attempts": attempts,
                    },
                )
            logger.info(
                "login_attempt",
                extra={
                    "request_id": getattr(request, "request_id", None),
                    "status_code": status.HTTP_401_UNAUTHORIZED,
                    "email": email,
                    "ip_address": ip_address,
                },
            )
            raise

        refresh_token = response.data.get("refresh")
        access_token = response.data.get("access")
        response_payload = Response({"access": access_token}, status=response.status_code)
        if refresh_token:
            _set_refresh_cookie(response_payload, refresh_token)

        if response.status_code == status.HTTP_200_OK and email:
            _clear_login_failures(failure_key)

        logger.info(
            "login_attempt",
            extra={
                "request_id": getattr(request, "request_id", None),
                "status_code": response.status_code,
                "email": email,
                "ip_address": ip_address,
            },
        )
        log_timed_event(
            logger,
            "login_completed",
            request,
            started_at,
            email=email,
            status_code=response.status_code,
        )
        return _ensure_csrf_cookie(request, response_payload)


class RefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        started_at = perf_counter()
        body_refresh_token = request.data.get("refresh")
        cookie_refresh_token = request.COOKIES.get("refresh_token")
        refresh_token = body_refresh_token or cookie_refresh_token
        if not refresh_token:
            raise ValidationError({"detail": "refresh token is required"})

        if not body_refresh_token and cookie_refresh_token:
            _require_csrf_for_cookie_flow(request)

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        serializer.is_valid(raise_exception=True)
        response = Response({"access": serializer.validated_data["access"]})
        if serializer.validated_data.get("refresh"):
            _set_refresh_cookie(response, serializer.validated_data["refresh"])
        logger.info(
            "token_refresh",
            extra={
                "request_id": getattr(request, "request_id", None),
                "cookie_auth": bool(cookie_refresh_token and not body_refresh_token),
            },
        )
        log_timed_event(
            logger,
            "token_refresh_completed",
            request,
            started_at,
            cookie_auth=bool(cookie_refresh_token and not body_refresh_token),
        )
        return _ensure_csrf_cookie(request, response)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        started_at = perf_counter()
        body_refresh_token = request.data.get("refresh")
        cookie_refresh_token = request.COOKIES.get("refresh_token")
        refresh_token = body_refresh_token or cookie_refresh_token
        if not refresh_token:
            return Response({"detail": "refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not body_refresh_token and cookie_refresh_token:
            _require_csrf_for_cookie_flow(request)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(
            "logout",
            extra={"request_id": getattr(request, "request_id", None), "user_id": str(request.user.id)},
        )
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie("refresh_token", path="/api/v1/auth")
        log_timed_event(
            logger,
            "logout_completed",
            request,
            started_at,
        )
        return response


class EmailVerificationRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        user = request.user
        if user.is_verified:
            return Response({"detail": "Email is already verified."}, status=status.HTTP_200_OK)

        verification_token = _generate_email_verification_token(user)
        logger.info(
            "email_verification_requested",
            extra={"request_id": getattr(request, "request_id", None), "user_id": str(user.id)},
        )

        payload = {"detail": "Email verification token generated."}
        if settings.DEBUG or settings.TESTING:
            payload["verification_token"] = verification_token
        return Response(payload, status=status.HTTP_200_OK)


class EmailVerificationConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_payload = _decode_email_verification_token(serializer.validated_data["token"])
        user = User.objects.filter(id=token_payload.get("user_id"), email=token_payload.get("email")).first()
        if not user:
            raise ValidationError({"detail": "Invalid or expired email verification token."})

        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=["is_verified"])

        logger.info(
            "email_verified",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(user.id),
            },
        )
        return Response({"detail": "Email verified successfully."}, status=status.HTTP_200_OK)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserMeSerializer

    def retrieve(self, request, *args, **kwargs):
        started_at = perf_counter()
        response = super().retrieve(request, *args, **kwargs)
        log_timed_event(logger, "profile_read_completed", request, started_at)
        return response

    def partial_update(self, request, *args, **kwargs):
        started_at = perf_counter()
        response = super().partial_update(request, *args, **kwargs)
        log_timed_event(logger, "profile_update_completed", request, started_at)
        return response

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info(
            "profile_updated",
            extra={
                "request_id": getattr(self.request, "request_id", None),
                "user_id": str(instance.id),
            },
        )


class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    lookup_field = "username"


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        started_at = perf_counter()
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payload = _verify_google_id_token(serializer.validated_data["id_token"])
        user = _upsert_google_user(payload)
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "user": UserMeSerializer(user).data,
                "access": str(refresh.access_token),
            },
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, str(refresh))
        logger.info(
            "google_auth_success",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(user.id),
            },
        )
        log_timed_event(
            logger,
            "google_auth_completed",
            request,
            started_at,
            created_user_id=str(user.id),
        )
        return _ensure_csrf_cookie(request, response)
