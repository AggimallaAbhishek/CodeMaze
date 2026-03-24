from __future__ import annotations

from uuid import uuid4


class RequestIDMiddleware:
    """Attach a request ID for observability and correlate API logs."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = request.headers.get("X-Request-ID", str(uuid4()))
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        return response
