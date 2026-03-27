#!/bin/sh
set -eu

python manage.py migrate

if [ "${STARTUP_SEED_DATA:-false}" = "true" ]; then
  python manage.py seed_sorting_levels
  python manage.py seed_pathfinding_levels
  python manage.py seed_graph_levels
fi

exec gunicorn puzzle_api.wsgi:application --config /app/apps/api/gunicorn.conf.py
