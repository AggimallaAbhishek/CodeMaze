from __future__ import annotations

import json
import logging
from uuid import uuid4

import redis
from redis.exceptions import RedisError
from django.conf import settings

logger = logging.getLogger(__name__)

SESSION_TTL_SECONDS = 30 * 60
_SESSION_FALLBACK: dict[str, dict] = {}


def get_redis_client() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def create_game_session(user_id: str, level_id: str) -> tuple[str, int]:
    session_id = f"sess_{uuid4().hex}"
    payload = {
        "session_id": session_id,
        "user_id": user_id,
        "level_id": level_id,
    }

    try:
        client = get_redis_client()
        client.setex(f"game_session:{session_id}", SESSION_TTL_SECONDS, json.dumps(payload))
    except RedisError:
        _SESSION_FALLBACK[session_id] = payload
        logger.warning("redis_unavailable_session_fallback", extra={"session_id": session_id})

    logger.info("session_created", extra={"session_id": session_id, "user_id": user_id, "level_id": level_id})
    return session_id, SESSION_TTL_SECONDS


def get_game_session(session_id: str) -> dict | None:
    try:
        client = get_redis_client()
        raw = client.get(f"game_session:{session_id}")
        if not raw:
            return None
        return json.loads(raw)
    except RedisError:
        return _SESSION_FALLBACK.get(session_id)
