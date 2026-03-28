#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
import time

import psycopg


def main() -> int:
    host = os.getenv("POSTGRES_HOST", "")
    port = int(os.getenv("POSTGRES_PORT", "5432"))
    dbname = os.getenv("POSTGRES_DB", "")
    user = os.getenv("POSTGRES_USER", "")
    password = os.getenv("POSTGRES_PASSWORD", "")
    timeout_seconds = int(os.getenv("POSTGRES_READY_TIMEOUT_SECONDS", "120"))

    if not all([host, dbname, user, password]):
        print("[startup] Postgres connection details are incomplete.", file=sys.stderr)
        return 1

    deadline = time.monotonic() + timeout_seconds
    attempt = 0

    while time.monotonic() < deadline:
        attempt += 1
        try:
            with psycopg.connect(
                host=host,
                port=port,
                dbname=dbname,
                user=user,
                password=password,
                connect_timeout=5,
            ) as connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
            print(f"[startup] Postgres is ready after {attempt} attempt(s).", flush=True)
            return 0
        except psycopg.Error as exc:
            print(f"[startup] Waiting for Postgres (attempt {attempt}): {exc}", flush=True)
            time.sleep(5)

    print(f"[startup] Postgres did not become ready within {timeout_seconds} seconds.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
