from __future__ import annotations

import pytest
from django.test import override_settings


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["staging-api.codemaze.me"])
def test_alb_health_check_private_ip_host_is_rewritten(client):
    response = client.get(
        "/api/v1/healthz",
        HTTP_HOST="10.40.10.204:8000",
        HTTP_USER_AGENT="ELB-HealthChecker/2.0",
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=["staging-api.codemaze.me"])
def test_private_ip_host_remains_blocked_for_non_health_routes(client):
    response = client.get(
        "/api/v1/leaderboard",
        HTTP_HOST="10.40.10.204:8000",
        HTTP_USER_AGENT="ELB-HealthChecker/2.0",
    )

    assert response.status_code == 400
