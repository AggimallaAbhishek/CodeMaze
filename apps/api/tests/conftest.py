from __future__ import annotations

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from redis.exceptions import RedisError

from game.services import get_redis_client as get_game_redis_client
from leaderboard.services import get_redis_client as get_leaderboard_redis_client
from users.models import User


@pytest.fixture
def user(db):
    return User.objects.create_user(email="user@example.com", username="user1", password="StrongPass123!")


@pytest.fixture
def auth_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def auth_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


@pytest.fixture(autouse=True)
def clear_redis_state():
    for factory in (get_game_redis_client, get_leaderboard_redis_client):
        try:
            factory().flushdb()
        except (AttributeError, RedisError):
            continue
    yield
    for factory in (get_game_redis_client, get_leaderboard_redis_client):
        try:
            factory().flushdb()
        except (AttributeError, RedisError):
            continue
