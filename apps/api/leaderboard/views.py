from __future__ import annotations

import logging
from time import perf_counter

from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from common.observability import log_timed_event
from leaderboard.services import get_global_leaderboard, get_level_leaderboard, normalize_scope

logger = logging.getLogger(__name__)


def _parse_limit(raw_limit: str | None, default: int) -> int:
    if raw_limit is None:
        return default
    try:
        limit = int(raw_limit)
    except ValueError as exc:
        raise ValidationError({"limit": "Limit must be an integer between 1 and 100."}) from exc
    return min(max(limit, 1), 100)


class LeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        started_at = perf_counter()
        try:
            scope = normalize_scope(request.query_params.get("scope", "all_time"))
        except ValueError as exc:
            raise ValidationError({"scope": str(exc)}) from exc

        limit = _parse_limit(request.query_params.get("limit"), default=50)
        user_id = str(request.user.id) if request.user.is_authenticated else None
        data = get_global_leaderboard(scope=scope, limit=limit, user_id=user_id)
        log_timed_event(
            logger,
            "leaderboard_global_served",
            request,
            started_at,
            scope=scope,
            limit=limit,
            result_count=len(data["entries"]),
        )
        return Response({"scope": scope, **data})


class LevelLeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, level_id):
        started_at = perf_counter()
        try:
            scope = normalize_scope(request.query_params.get("scope", "all_time"))
        except ValueError as exc:
            raise ValidationError({"scope": str(exc)}) from exc

        limit = _parse_limit(request.query_params.get("limit"), default=20)
        user_id = str(request.user.id) if request.user.is_authenticated else None
        data = get_level_leaderboard(level_id=str(level_id), scope=scope, limit=limit, user_id=user_id)
        log_timed_event(
            logger,
            "leaderboard_level_served",
            request,
            started_at,
            scope=scope,
            level_id=str(level_id),
            limit=limit,
            result_count=len(data["entries"]),
        )
        return Response({"scope": scope, "level_id": str(level_id), **data})
