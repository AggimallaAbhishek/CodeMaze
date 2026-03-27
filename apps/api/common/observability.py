from __future__ import annotations

from time import perf_counter


def request_log_context(request, **extra):
    user = getattr(request, "user", None)
    user_id = str(user.id) if getattr(user, "is_authenticated", False) else None
    return {
        "request_id": getattr(request, "request_id", None),
        "user_id": user_id,
        **extra,
    }


def log_timed_event(logger, event_name: str, request, started_at: float, **extra) -> float:
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    logger.info(
        event_name,
        extra=request_log_context(request, duration_ms=duration_ms, **extra),
    )
    return duration_ms
