#!/bin/sh
set -eu

echo "[startup] Waiting for PostgreSQL before starting API"
python /app/apps/api/bin/wait-for-postgres.py

if [ "${RUN_MIGRATIONS_ON_STARTUP:-true}" = "true" ]; then
  echo "[startup] Running database migrations"
  python manage.py migrate
fi

if [ "${STARTUP_SEED_DATA:-false}" = "true" ]; then
  echo "[startup] Seeding initial level data"
  python manage.py seed_sorting_levels
  python manage.py seed_pathfinding_levels
  python manage.py seed_graph_levels
fi

echo "[startup] Launching Gunicorn"
exec gunicorn puzzle_api.wsgi:application --config /app/apps/api/gunicorn.conf.py
