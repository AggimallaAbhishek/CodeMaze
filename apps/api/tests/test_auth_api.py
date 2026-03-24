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
