from __future__ import annotations

from redis.exceptions import RedisError


def test_healthz_returns_ok(client):
    response = client.get("/api/v1/healthz")

    assert response.status_code == 200
    assert response.data["status"] == "ok"
    assert response.data["service"] == "api"


def test_readyz_returns_ready_when_dependencies_pass(client, monkeypatch):
    class HealthyRedis:
        def ping(self):
            return True

    monkeypatch.setattr("common.views.redis.from_url", lambda *args, **kwargs: HealthyRedis())

    response = client.get("/api/v1/readyz")

    assert response.status_code == 200
    assert response.data["status"] == "ready"
    assert response.data["checks"]["database"]["ok"] is True
    assert response.data["checks"]["redis"]["ok"] is True


def test_readyz_returns_service_unavailable_when_redis_fails(client, monkeypatch):
    class BrokenRedis:
        def ping(self):
            raise RedisError("redis down")

    monkeypatch.setattr("common.views.redis.from_url", lambda *args, **kwargs: BrokenRedis())

    response = client.get("/api/v1/readyz")

    assert response.status_code == 503
    assert response.data["status"] == "degraded"
    assert response.data["checks"]["redis"]["ok"] is False
    assert response.data["checks"]["redis"]["detail"] == "Redis unavailable."


def test_production_settings_enable_secure_defaults():
    from puzzle_api import settings_production

    assert settings_production.DEBUG is False
    assert settings_production.SECURE_SSL_REDIRECT is True
    assert settings_production.SESSION_COOKIE_SECURE is True
    assert settings_production.CSRF_COOKIE_SECURE is True
    assert settings_production.SECURE_PROXY_SSL_HEADER == ("HTTP_X_FORWARDED_PROTO", "https")


def test_staging_settings_reduce_hsts_window():
    from puzzle_api import settings_staging

    assert settings_staging.SECURE_HSTS_SECONDS == 3600
