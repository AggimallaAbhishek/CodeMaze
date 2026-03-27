import os

from .settings_production import *  # noqa: F401,F403

SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "3600"))
