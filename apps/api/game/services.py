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
        "hints_used": 0,
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


def _store_game_session(session_id: str, payload: dict) -> dict:
    try:
        client = get_redis_client()
        key = f"game_session:{session_id}"
        ttl = client.ttl(key)
        if ttl is None or ttl <= 0:
            ttl = SESSION_TTL_SECONDS
        client.setex(key, ttl, json.dumps(payload))
    except RedisError:
        _SESSION_FALLBACK[session_id] = payload
        logger.warning("redis_unavailable_session_update_fallback", extra={"session_id": session_id})
    return payload


def increment_session_hints(session_id: str) -> dict | None:
    session = get_game_session(session_id)
    if not session:
        return None

    session["hints_used"] = int(session.get("hints_used", 0)) + 1
    logger.info(
        "session_hint_incremented",
        extra={
            "session_id": session_id,
            "user_id": session.get("user_id"),
            "level_id": session.get("level_id"),
            "hints_used": session["hints_used"],
        },
    )
    return _store_game_session(session_id, session)
