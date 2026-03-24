from __future__ import annotations

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from leaderboard.services import get_global_leaderboard, get_level_leaderboard


class LeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        scope = request.query_params.get("scope", "all_time")
        limit = int(request.query_params.get("limit", 50))
        data = get_global_leaderboard(scope=scope, limit=min(max(limit, 1), 100))
        return Response({"scope": scope, "entries": data})


class LevelLeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, level_id):
        scope = request.query_params.get("scope", "all_time")
        limit = int(request.query_params.get("limit", 20))
        data = get_level_leaderboard(level_id=str(level_id), scope=scope, limit=min(max(limit, 1), 100))
        return Response({"scope": scope, "level_id": str(level_id), "entries": data})
