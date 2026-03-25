from __future__ import annotations

import json
import logging
from datetime import timedelta
from uuid import uuid4

import redis
from redis.exceptions import RedisError
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from game.models import GameSession

logger = logging.getLogger(__name__)

SESSION_TTL_SECONDS = 30 * 60


def get_redis_client() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def _cache_key(session_id: str) -> str:
    return f"game_session:{session_id}"


def _remaining_ttl_seconds(expires_at) -> int:
    return max(int((expires_at - timezone.now()).total_seconds()), 0)


def _serialize_session(session: GameSession) -> dict:
    return {
        "session_id": session.session_id,
        "user_id": str(session.user_id),
        "level_id": str(session.level_id),
        "hints_used": int(session.hints_used),
        "expires_at": session.expires_at.isoformat(),
    }


def _cache_session(payload: dict) -> dict:
    expires_at = parse_datetime(payload.get("expires_at", ""))
    if not expires_at:
        return payload

    ttl = _remaining_ttl_seconds(expires_at)
    if ttl <= 0:
        return payload

    try:
        client = get_redis_client()
        client.setex(_cache_key(payload["session_id"]), ttl, json.dumps(payload))
    except RedisError:
        logger.warning("redis_unavailable_session_cache", extra={"session_id": payload["session_id"]})
    return payload


def _load_session_from_database(session_id: str) -> dict | None:
    session = GameSession.objects.filter(session_id=session_id).first()
    if not session or session.expires_at <= timezone.now():
        return None

    payload = _serialize_session(session)
    _cache_session(payload)
    return payload


def _decode_cached_session(raw: str, session_id: str) -> dict | None:
    payload = json.loads(raw)
    expires_at = parse_datetime(payload.get("expires_at", ""))
    if not expires_at:
        logger.warning("session_cache_missing_expiry", extra={"session_id": session_id})
        return None

    if expires_at <= timezone.now():
        try:
            client = get_redis_client()
            client.delete(_cache_key(session_id))
        except RedisError:
            logger.warning("redis_unavailable_expired_session_delete", extra={"session_id": session_id})
        return None
    return payload


def create_game_session(user_id: str, level_id: str) -> tuple[str, int]:
    session_id = f"sess_{uuid4().hex}"
    session = GameSession.objects.create(
        session_id=session_id,
        user_id=user_id,
        level_id=level_id,
        hints_used=0,
        expires_at=timezone.now() + timedelta(seconds=SESSION_TTL_SECONDS),
    )
    payload = _serialize_session(session)
    _cache_session(payload)

    logger.info("session_created", extra={"session_id": session_id, "user_id": user_id, "level_id": level_id})
    return session_id, SESSION_TTL_SECONDS


def get_game_session(session_id: str) -> dict | None:
    try:
        client = get_redis_client()
        raw = client.get(_cache_key(session_id))
        if raw:
            payload = _decode_cached_session(raw, session_id)
            if payload:
                return payload
    except RedisError:
        logger.warning("redis_unavailable_session_read", extra={"session_id": session_id})
    return _load_session_from_database(session_id)


def increment_session_hints(session_id: str) -> dict | None:
    with transaction.atomic():
        session = GameSession.objects.select_for_update().filter(session_id=session_id).first()
        if not session or session.expires_at <= timezone.now():
            return None

        GameSession.objects.filter(pk=session.pk).update(hints_used=F("hints_used") + 1)
        session.refresh_from_db(fields=["hints_used"])
        payload = _serialize_session(session)

    logger.info(
        "session_hint_incremented",
        extra={
            "session_id": session_id,
            "user_id": str(session.user_id),
            "level_id": str(session.level_id),
            "hints_used": session.hints_used,
        },
    )
    return _cache_session(payload)
