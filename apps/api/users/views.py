from __future__ import annotations

import logging

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from users.models import User
from users.serializers import PublicProfileSerializer, RegisterSerializer, UserMeSerializer

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        user = User.objects.get(email=response.data["email"])
        refresh = RefreshToken.for_user(user)
        logger.info(
            "user_registered",
            extra={"request_id": getattr(request, "request_id", None), "user_id": str(user.id)},
        )
        return Response(
            {
                "user": UserMeSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        logger.info(
            "login_attempt",
            extra={
                "request_id": getattr(request, "request_id", None),
                "status_code": response.status_code,
                "email": request.data.get("email"),
            },
        )
        return response


class RefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        logger.info(
            "token_refresh",
            extra={"request_id": getattr(request, "request_id", None)},
        )
        return Response(serializer.validated_data)


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

        token = RefreshToken(refresh_token)
        token.blacklist()
        logger.info(
            "logout",
            extra={"request_id": getattr(request, "request_id", None), "user_id": str(request.user.id)},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserMeSerializer

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

    def get(self, request):
        return Response(
            {"detail": "Google OAuth flow placeholder. Integrate django-allauth in Phase 4."},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )
