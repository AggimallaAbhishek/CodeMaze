#!/bin/sh
set -eu

echo "[startup] Waiting for PostgreSQL before starting worker"
python /app/apps/api/bin/wait-for-postgres.py

if [ "${RUN_MIGRATIONS_ON_STARTUP:-false}" = "true" ]; then
  echo "[startup] Running database migrations from worker startup"
  python manage.py migrate
fi

echo "[startup] Launching Celery worker"
exec celery -A puzzle_api.celery_app worker -l "${CELERY_LOG_LEVEL:-info}"
