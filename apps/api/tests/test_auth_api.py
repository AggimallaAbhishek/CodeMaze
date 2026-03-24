from __future__ import annotations

import pytest


@pytest.mark.django_db
def test_register_returns_tokens(client):
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
def test_refresh_uses_cookie_if_payload_missing(client, auth_tokens):
    client.cookies["refresh_token"] = auth_tokens["refresh"]
    response = client.post("/api/v1/auth/refresh", {}, format="json")
    assert response.status_code == 200
    assert "access" in response.data


@pytest.mark.django_db
def test_logout_blacklists_token_and_clears_cookie(auth_client, auth_tokens):
    response = auth_client.post("/api/v1/auth/logout", {"refresh": auth_tokens["refresh"]}, format="json")
    assert response.status_code == 204
    assert "refresh_token" in response.cookies
