from __future__ import annotations

import ipaddress
from uuid import uuid4

from django.conf import settings


HEALTH_CHECK_PATHS = {"/api/v1/healthz", "/api/v1/readyz"}


def _host_without_port(host: str) -> str:
    if not host:
        return ""
    if host.startswith("[") and "]" in host:
        return host[1 : host.index("]")]
    return host.split(":", maxsplit=1)[0]


def _is_private_ip_host(host: str) -> bool:
    candidate = _host_without_port(host)
    try:
        return ipaddress.ip_address(candidate).is_private
    except ValueError:
        return False


def _healthcheck_allowed_host() -> str:
    for host in settings.ALLOWED_HOSTS:
        candidate = host.strip()
        if candidate and candidate != "*":
            return candidate
    return "localhost"


class LoadBalancerHealthHostRewriteMiddleware:
    """Allow ALB health checks with private-IP host headers without weakening ALLOWED_HOSTS globally."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.META.get("HTTP_HOST", "")
        path = request.path
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        if (
            path in HEALTH_CHECK_PATHS
            and user_agent.startswith("ELB-HealthChecker/")
            and _is_private_ip_host(host)
        ):
            request.META["HTTP_HOST"] = _healthcheck_allowed_host()

        return self.get_response(request)


class RequestIDMiddleware:
    """Attach a request ID for observability and correlate API logs."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = request.headers.get("X-Request-ID", str(uuid4()))
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        return response
