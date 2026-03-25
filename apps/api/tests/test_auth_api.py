from __future__ import annotations

import pytest
from django.core.cache import cache

from users.models import User


@pytest.fixture(autouse=True)
def clear_auth_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_register_returns_tokens_and_verification_token(client):
    response = client.post(
        "/api/v1/auth/register",
        {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "StrongPass123!",
        },
        format="json",
    )

    assert response.status_code == 201
    assert "access" in response.data
    assert "refresh" in response.data
    assert response.data["email_verification_required"] is True
    assert "verification_token" in response.data
    assert "refresh_token" in response.cookies


@pytest.mark.django_db
def test_login_returns_tokens(client, user):
    response = client.post(
        "/api/v1/auth/login",
        {
            "email": user.email,
            "password": "StrongPass123!",
        },
        format="json",
    )
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data
    assert "refresh_token" in response.cookies


@pytest.mark.django_db
def test_login_lockout_blocks_after_repeated_failures(client, settings, user):
    settings.AUTH_LOGIN_FAILURE_LIMIT = 3

    for _ in range(3):
        response = client.post(
            "/api/v1/auth/login",
            {
                "email": user.email,
                "password": "WrongPass123!",
            },
            format="json",
        )
        assert response.status_code == 401

    blocked = client.post(
        "/api/v1/auth/login",
        {
            "email": user.email,
            "password": "WrongPass123!",
        },
        format="json",
    )
    assert blocked.status_code == 429
    assert "Too many failed login attempts" in blocked.data["detail"]


@pytest.mark.django_db
def test_refresh_uses_body_token_without_csrf(client, auth_tokens):
    response = client.post("/api/v1/auth/refresh", {"refresh": auth_tokens["refresh"]}, format="json")
    assert response.status_code == 200
    assert "access" in response.data


@pytest.mark.django_db
def test_refresh_cookie_flow_requires_csrf_header(client, auth_tokens, settings):
    client.cookies["refresh_token"] = auth_tokens["refresh"]
    client.cookies[settings.CSRF_COOKIE_NAME] = "csrf-cookie-token"

    missing_csrf = client.post("/api/v1/auth/refresh", {}, format="json")
    assert missing_csrf.status_code == 400
    assert "CSRF token" in missing_csrf.data["detail"]

    allowed = client.post(
        "/api/v1/auth/refresh",
        {},
        format="json",
        HTTP_X_CSRFTOKEN="csrf-cookie-token",
    )
    assert allowed.status_code == 200
    assert "access" in allowed.data


@pytest.mark.django_db
def test_logout_blacklists_token_and_clears_cookie(auth_client, auth_tokens):
    response = auth_client.post("/api/v1/auth/logout", {"refresh": auth_tokens["refresh"]}, format="json")
    assert response.status_code == 204
    assert "refresh_token" in response.cookies


@pytest.mark.django_db
def test_logout_cookie_flow_requires_csrf(auth_client, auth_tokens, settings):
    auth_client.cookies["refresh_token"] = auth_tokens["refresh"]
    auth_client.cookies[settings.CSRF_COOKIE_NAME] = "csrf-cookie-token"

    missing_csrf = auth_client.post("/api/v1/auth/logout", {}, format="json")
    assert missing_csrf.status_code == 400
    assert "CSRF token" in missing_csrf.data["detail"]

    allowed = auth_client.post(
        "/api/v1/auth/logout",
        {},
        format="json",
        HTTP_X_CSRFTOKEN="csrf-cookie-token",
    )
    assert allowed.status_code == 204


@pytest.mark.django_db
def test_email_verification_request_and_confirm_flow(auth_client, user):
    user.is_verified = False
    user.save(update_fields=["is_verified"])

    request_response = auth_client.post("/api/v1/auth/verify-email/request", {}, format="json")
    assert request_response.status_code == 200
    assert "verification_token" in request_response.data

    confirm_response = auth_client.post(
        "/api/v1/auth/verify-email/confirm",
        {"token": request_response.data["verification_token"]},
        format="json",
    )
    assert confirm_response.status_code == 200

    user.refresh_from_db()
    assert user.is_verified is True


@pytest.mark.django_db
def test_email_verification_confirm_rejects_invalid_token(client):
    response = client.post("/api/v1/auth/verify-email/confirm", {"token": "invalid-token"}, format="json")
    assert response.status_code == 400
    assert "Invalid or expired" in response.data["detail"]


@pytest.mark.django_db
def test_google_auth_creates_verified_user(client, monkeypatch):
    payload = {
        "email": "google-user@example.com",
        "email_verified": "true",
        "name": "Google Player",
        "picture": "https://example.com/avatar.png",
        "aud": "",
    }
    monkeypatch.setattr("users.views._verify_google_id_token", lambda id_token: payload)

    response = client.post("/api/v1/auth/google", {"id_token": "google-token"}, format="json")
    assert response.status_code == 200
    assert response.data["user"]["email"] == payload["email"]
    assert response.data["user"]["is_verified"] is True
    assert "refresh_token" in response.cookies

    user = User.objects.get(email=payload["email"])
    assert user.oauth_provider == User.OAuthProvider.GOOGLE


@pytest.mark.django_db
def test_google_auth_rejects_invalid_google_token(client, monkeypatch):
    def fake_verify(_id_token):
        from rest_framework.exceptions import ValidationError

        raise ValidationError({"detail": "Google token audience mismatch."})

    monkeypatch.setattr("users.views._verify_google_id_token", fake_verify)

    response = client.post("/api/v1/auth/google", {"id_token": "bad-token"}, format="json")
    assert response.status_code == 400
    assert response.data["detail"] == "Google token audience mismatch."
