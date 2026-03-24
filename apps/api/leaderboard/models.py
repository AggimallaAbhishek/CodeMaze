from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class LeaderboardEntry(models.Model):
    class Scope(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        ALL_TIME = "all_time", "All Time"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    level = models.ForeignKey("game.Level", on_delete=models.CASCADE, null=True, blank=True)
    scope = models.CharField(max_length=16, choices=Scope.choices)
    score = models.PositiveIntegerField()
    rank = models.PositiveIntegerField(default=0)
    week_number = models.PositiveSmallIntegerField(null=True, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class UserBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="badges")
    badge_code = models.CharField(max_length=64)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "badge_code")
