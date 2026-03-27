#!/bin/sh
set -eu

python manage.py migrate
exec celery -A puzzle_api.celery_app worker -l "${CELERY_LOG_LEVEL:-info}"
