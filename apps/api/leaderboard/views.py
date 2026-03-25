from __future__ import annotations

from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from leaderboard.services import get_global_leaderboard, get_level_leaderboard, normalize_scope


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
        try:
            scope = normalize_scope(request.query_params.get("scope", "all_time"))
        except ValueError as exc:
            raise ValidationError({"scope": str(exc)}) from exc

        limit = _parse_limit(request.query_params.get("limit"), default=50)
        user_id = str(request.user.id) if request.user.is_authenticated else None
        data = get_global_leaderboard(scope=scope, limit=limit, user_id=user_id)
        return Response({"scope": scope, **data})


class LevelLeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, level_id):
        try:
            scope = normalize_scope(request.query_params.get("scope", "all_time"))
        except ValueError as exc:
            raise ValidationError({"scope": str(exc)}) from exc

        limit = _parse_limit(request.query_params.get("limit"), default=20)
        user_id = str(request.user.id) if request.user.is_authenticated else None
        data = get_level_leaderboard(level_id=str(level_id), scope=scope, limit=limit, user_id=user_id)
        return Response({"scope": scope, "level_id": str(level_id), **data})
