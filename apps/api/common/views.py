from __future__ import annotations

import logging
from time import perf_counter

import redis
from django.conf import settings
from django.db import connections
from django.db.utils import OperationalError
from django.utils import timezone
from redis.exceptions import RedisError
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.observability import log_timed_event

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "service": "api",
                "timestamp": timezone.now(),
            },
            status=status.HTTP_200_OK,
        )


class ReadinessView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get(self, request):
        started_at = perf_counter()
        checks = {
            "database": self._database_check(),
            "redis": self._redis_check(),
        }
        is_ready = all(item["ok"] for item in checks.values())
        log_timed_event(
            logger,
            "readiness_checked",
            request,
            started_at,
            ready=is_ready,
        )
        return Response(
            {
                "status": "ready" if is_ready else "degraded",
                "checks": checks,
                "timestamp": timezone.now(),
            },
            status=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def _database_check(self) -> dict:
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return {"ok": True}
        except OperationalError as exc:
            logger.warning("readiness_database_unavailable", extra={"error": str(exc)})
            return {"ok": False, "detail": "Database unavailable."}

    def _redis_check(self) -> dict:
        try:
            client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            client.ping()
            return {"ok": True}
        except RedisError as exc:
            logger.warning("readiness_redis_unavailable", extra={"error": str(exc)})
            return {"ok": False, "detail": "Redis unavailable."}
