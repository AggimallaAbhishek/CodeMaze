from __future__ import annotations

import importlib.util
import io
from pathlib import Path
import urllib.error


def load_smoke_module():
    module_path = Path(__file__).resolve().parents[3] / "infra" / "scripts" / "smoke.py"
    spec = importlib.util.spec_from_file_location("smoke_script", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_parse_response_payload_wraps_non_json_body():
    smoke = load_smoke_module()

    payload = smoke.parse_response_payload("<html>bad gateway</html>", "text/html")

    assert payload["detail"] == "Response body was not valid JSON."
    assert payload["content_type"] == "text/html"
    assert "bad gateway" in payload["raw_body"]
    assert "Expecting value" in payload["parse_error"]


def test_request_handles_http_error_with_non_json_body(monkeypatch):
    smoke = load_smoke_module()
    smoke.API_BASE_URL = "https://staging-api.codemaze.me/api/v1"

    def fake_urlopen(_request, timeout=20):  # noqa: ARG001
        raise urllib.error.HTTPError(
            url="https://staging-api.codemaze.me/api/v1/readyz",
            code=503,
            msg="Service Unavailable",
            hdrs={"Content-Type": "text/html"},
            fp=io.BytesIO(b"<html>temporarily unavailable</html>"),
        )

    monkeypatch.setattr(smoke.urllib.request, "urlopen", fake_urlopen)

    status, payload = smoke.request("/readyz")

    assert status == 503
    assert payload["detail"] == "Response body was not valid JSON."
    assert payload["content_type"] == "text/html"
    assert "temporarily unavailable" in payload["raw_body"]


def test_wait_for_check_retries_until_service_is_ready(monkeypatch):
    smoke = load_smoke_module()
    attempts = iter(
        [
            (503, {"detail": "warming up"}),
            (502, {"detail": "target unavailable"}),
            (200, {"status": "ready"}),
        ]
    )

    monkeypatch.setattr(smoke.time, "sleep", lambda _seconds: None)

    status, payload = smoke.wait_for_check(
        "/readyz",
        lambda: next(attempts),
        is_ready=lambda status, payload: status == 200 and payload.get("status") == "ready",
        attempts=3,
        delay_seconds=0,
    )

    assert status == 200
    assert payload == {"status": "ready"}
