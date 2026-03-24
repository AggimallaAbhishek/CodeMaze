from __future__ import annotations

from datetime import datetime

import redis
from redis.exceptions import RedisError
from django.conf import settings

from users.models import User

_LEADERBOARD_FALLBACK: dict[str, dict[str, int]] = {}


def get_redis_client() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def _global_key(scope: str) -> str:
    if scope == "weekly":
        now = datetime.utcnow().isocalendar()
        return f"leaderboard:global:weekly:{now.year}:{now.week}"
    if scope == "monthly":
        now = datetime.utcnow()
        return f"leaderboard:global:monthly:{now.year}:{now.month}"
    return "leaderboard:global:all_time"


def _level_key(level_id: str, scope: str) -> str:
    if scope == "weekly":
        now = datetime.utcnow().isocalendar()
        return f"leaderboard:level:{level_id}:weekly:{now.year}:{now.week}"
    if scope == "monthly":
        now = datetime.utcnow()
        return f"leaderboard:level:{level_id}:monthly:{now.year}:{now.month}"
    return f"leaderboard:level:{level_id}:all_time"


def update_leaderboards(user_id: str, level_id: str, score: int) -> None:
    try:
        client = get_redis_client()
        for scope in ["all_time", "weekly", "monthly"]:
            client.zadd(_global_key(scope), {user_id: score})
            client.zadd(_level_key(level_id, scope), {user_id: score})
    except RedisError:
        for scope in ["all_time", "weekly", "monthly"]:
            global_key = _global_key(scope)
            level_key = _level_key(level_id, scope)
            _LEADERBOARD_FALLBACK.setdefault(global_key, {})[user_id] = score
            _LEADERBOARD_FALLBACK.setdefault(level_key, {})[user_id] = score


def _hydrate_rows(rows: list[tuple[str, float]]) -> list[dict]:
    user_ids = [row[0] for row in rows]
    users = User.objects.filter(id__in=user_ids)
    users_by_id = {str(user.id): user for user in users}

    payload = []
    for rank, (user_id, score) in enumerate(rows, start=1):
        user = users_by_id.get(str(user_id))
        payload.append(
            {
                "rank": rank,
                "user_id": user_id,
                "username": user.username if user else "unknown",
                "avatar_url": user.avatar_url if user else "",
                "score": int(score),
            }
        )
    return payload


def get_global_leaderboard(scope: str, limit: int) -> list[dict]:
    key = _global_key(scope)
    try:
        client = get_redis_client()
        rows = client.zrevrange(key, 0, limit - 1, withscores=True)
    except RedisError:
        rows = sorted(
            _LEADERBOARD_FALLBACK.get(key, {}).items(),
            key=lambda pair: pair[1],
            reverse=True,
        )[:limit]
    return _hydrate_rows(rows)


def get_level_leaderboard(level_id: str, scope: str, limit: int) -> list[dict]:
    key = _level_key(level_id, scope)
    try:
        client = get_redis_client()
        rows = client.zrevrange(key, 0, limit - 1, withscores=True)
    except RedisError:
        rows = sorted(
            _LEADERBOARD_FALLBACK.get(key, {}).items(),
            key=lambda pair: pair[1],
            reverse=True,
        )[:limit]
    return _hydrate_rows(rows)
