from __future__ import annotations

import importlib.util
from pathlib import Path

import psycopg


def load_wait_module():
    module_path = Path(__file__).resolve().parents[3] / "apps" / "api" / "bin" / "wait-for-postgres.py"
    spec = importlib.util.spec_from_file_location("wait_for_postgres_script", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class FakeCursor:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query):
        assert query == "SELECT 1"

    def fetchone(self):
        return (1,)


class FakeConnection:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return FakeCursor()


def test_wait_for_postgres_retries_until_ready(monkeypatch):
    module = load_wait_module()
    attempts = {"count": 0}

    def fake_connect(**kwargs):
        attempts["count"] += 1
        assert kwargs["host"] == "db.internal"
        if attempts["count"] < 3:
            raise psycopg.OperationalError("database system is starting up")
        return FakeConnection()

    monkeypatch.setenv("POSTGRES_HOST", "db.internal")
    monkeypatch.setenv("POSTGRES_PORT", "5432")
    monkeypatch.setenv("POSTGRES_DB", "algorithm_puzzle")
    monkeypatch.setenv("POSTGRES_USER", "algorithm_puzzle")
    monkeypatch.setenv("POSTGRES_PASSWORD", "safe-password-123")
    monkeypatch.setenv("POSTGRES_READY_TIMEOUT_SECONDS", "30")
    monkeypatch.setattr(module.psycopg, "connect", fake_connect)
    monkeypatch.setattr(module.time, "sleep", lambda _seconds: None)

    result = module.main()

    assert result == 0
    assert attempts["count"] == 3


def test_wait_for_postgres_fails_when_env_is_incomplete(monkeypatch):
    module = load_wait_module()

    monkeypatch.delenv("POSTGRES_HOST", raising=False)
    monkeypatch.setenv("POSTGRES_PORT", "5432")
    monkeypatch.setenv("POSTGRES_DB", "algorithm_puzzle")
    monkeypatch.setenv("POSTGRES_USER", "algorithm_puzzle")
    monkeypatch.setenv("POSTGRES_PASSWORD", "safe-password-123")

    result = module.main()

    assert result == 1
