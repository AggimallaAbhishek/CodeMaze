from __future__ import annotations

import logging

import redis
from redis.exceptions import RedisError
from django.conf import settings
from django.db.models import Max
from django.utils import timezone

from leaderboard.models import LeaderboardEntry
from users.models import User

logger = logging.getLogger(__name__)

VALID_SCOPES = {"weekly", "monthly", "all_time"}


def get_redis_client() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def normalize_scope(scope: str) -> str:
    normalized = (scope or "all_time").strip().lower()
    if normalized not in VALID_SCOPES:
        raise ValueError("Scope must be one of: weekly, monthly, all_time.")
    return normalized


def _scope_context(scope: str):
    now = timezone.now()
    if scope == "weekly":
        iso_week = now.isocalendar()
        return {"year": iso_week.year, "week_number": iso_week.week, "month": None}
    if scope == "monthly":
        return {"year": now.year, "week_number": None, "month": now.month}
    return {"year": None, "week_number": None, "month": None}


def _global_key(scope: str) -> str:
    context = _scope_context(scope)
    if scope == "weekly":
        return f"leaderboard:global:weekly:{context['year']}:{context['week_number']}"
    if scope == "monthly":
        return f"leaderboard:global:monthly:{context['year']}:{context['month']}"
    return "leaderboard:global:all_time"


def _level_key(level_id: str, scope: str) -> str:
    context = _scope_context(scope)
    if scope == "weekly":
        return f"leaderboard:level:{level_id}:weekly:{context['year']}:{context['week_number']}"
    if scope == "monthly":
        return f"leaderboard:level:{level_id}:monthly:{context['year']}:{context['month']}"
    return f"leaderboard:level:{level_id}:all_time"


def _update_sorted_set_score(client: redis.Redis, key: str, user_id: str, score: int) -> None:
    current_score = client.zscore(key, user_id)
    if current_score is None or score > int(current_score):
        client.zadd(key, {user_id: score})


def _snapshot_queryset(scope: str, level_id: str | None = None):
    normalized_scope = normalize_scope(scope)
    context = _scope_context(normalized_scope)
    queryset = LeaderboardEntry.objects.filter(scope=normalized_scope)

    if level_id:
        queryset = queryset.filter(level_id=level_id)
    else:
        queryset = queryset.filter(level__isnull=True)

    if normalized_scope == "weekly":
        queryset = queryset.filter(year=context["year"], week_number=context["week_number"])
    elif normalized_scope == "monthly":
        queryset = queryset.filter(created_at__year=context["year"], created_at__month=context["month"])

    return queryset


def _record_snapshot(user_id: str, level_id: str | None, scope: str, score: int) -> None:
    existing_best = (
        _snapshot_queryset(scope=scope, level_id=level_id).filter(user_id=user_id).aggregate(max_score=Max("score"))["max_score"]
        or 0
    )
    if score <= existing_best:
        return

    context = _scope_context(scope)
    LeaderboardEntry.objects.create(
        user_id=user_id,
        level_id=level_id,
        scope=scope,
        score=score,
        rank=0,
        year=context["year"],
        week_number=context["week_number"],
    )


def update_leaderboards(user_id: str, level_id: str, score: int) -> None:
    for scope in ["all_time", "weekly", "monthly"]:
        try:
            client = get_redis_client()
            _update_sorted_set_score(client, _global_key(scope), user_id, score)
            _update_sorted_set_score(client, _level_key(level_id, scope), user_id, score)
        except RedisError:
            logger.warning(
                "leaderboard_redis_unavailable_snapshot_only",
                extra={"scope": scope, "user_id": user_id, "level_id": level_id},
            )

        _record_snapshot(user_id=user_id, level_id=None, scope=scope, score=score)
        _record_snapshot(user_id=user_id, level_id=level_id, scope=scope, score=score)

    logger.info(
        "leaderboard_updated",
        extra={"user_id": user_id, "level_id": level_id, "score": score},
    )


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


def _rows_from_snapshots(scope: str, limit: int, level_id: str | None = None) -> list[tuple[str, float]]:
    rows = (
        _snapshot_queryset(scope=scope, level_id=level_id)
        .values("user_id")
        .annotate(score=Max("score"))
        .order_by("-score", "user_id")[:limit]
    )
    return [(str(row["user_id"]), float(row["score"])) for row in rows]


def _rank_from_snapshots(scope: str, user_id: str, level_id: str | None = None) -> dict | None:
    rows = (
        _snapshot_queryset(scope=scope, level_id=level_id)
        .values("user_id")
        .annotate(score=Max("score"))
        .order_by("-score", "user_id")
    )
    for index, row in enumerate(rows, start=1):
        if str(row["user_id"]) == str(user_id):
            return {"rank": index, "score": int(row["score"])}
    return None


def _leaderboard_payload(rows: list[tuple[str, float]], user_rank: dict | None) -> dict:
    return {
        "generated_at": timezone.now(),
        "entries": _hydrate_rows(rows),
        "user_rank": user_rank,
    }


def get_global_leaderboard(scope: str, limit: int, user_id: str | None = None) -> dict:
    normalized_scope = normalize_scope(scope)
    key = _global_key(normalized_scope)

    try:
        client = get_redis_client()
        rows = client.zrevrange(key, 0, limit - 1, withscores=True)
        user_rank = None
        if user_id:
            rank = client.zrevrank(key, user_id)
            score = client.zscore(key, user_id)
            if rank is not None and score is not None:
                user_rank = {"rank": int(rank) + 1, "score": int(score)}
        return _leaderboard_payload(rows, user_rank)
    except RedisError:
        rows = _rows_from_snapshots(scope=normalized_scope, limit=limit)
        user_rank = _rank_from_snapshots(scope=normalized_scope, user_id=user_id) if user_id else None
        return _leaderboard_payload(rows, user_rank)


def get_level_leaderboard(level_id: str, scope: str, limit: int, user_id: str | None = None) -> dict:
    normalized_scope = normalize_scope(scope)
    key = _level_key(level_id, normalized_scope)

    try:
        client = get_redis_client()
        rows = client.zrevrange(key, 0, limit - 1, withscores=True)
        user_rank = None
        if user_id:
            rank = client.zrevrank(key, user_id)
            score = client.zscore(key, user_id)
            if rank is not None and score is not None:
                user_rank = {"rank": int(rank) + 1, "score": int(score)}
        return _leaderboard_payload(rows, user_rank)
    except RedisError:
        rows = _rows_from_snapshots(scope=normalized_scope, limit=limit, level_id=level_id)
        user_rank = _rank_from_snapshots(scope=normalized_scope, user_id=user_id, level_id=level_id) if user_id else None
        return _leaderboard_payload(rows, user_rank)
