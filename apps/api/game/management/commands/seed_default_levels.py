from __future__ import annotations

from contextlib import contextmanager

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection


ADVISORY_LOCK_KEY = 83421091


@contextmanager
def seed_lock():
    if connection.vendor != "postgresql":
        yield
        return

    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_lock(%s)", [ADVISORY_LOCK_KEY])
    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_unlock(%s)", [ADVISORY_LOCK_KEY])


class Command(BaseCommand):
    help = "Seed all default CodeMaze levels in an idempotent way."

    def handle(self, *args, **options):
        self.stdout.write("Seeding default levels.")
        with seed_lock():
            call_command("seed_sorting_levels")
            call_command("seed_pathfinding_levels")
            call_command("seed_graph_levels")
        self.stdout.write(self.style.SUCCESS("Default levels seeded."))
