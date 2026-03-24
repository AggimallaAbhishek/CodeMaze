from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Level(TimeStampedModel):
    class GameType(models.TextChoices):
        SORTING = "sorting", "Sorting"
        PATHFINDING = "pathfinding", "Pathfinding"
        GRAPH_TRAVERSAL = "graph_traversal", "Graph Traversal"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    game_type = models.CharField(max_length=32, choices=GameType.choices)
    difficulty = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    config = models.JSONField(default=dict)
    optimal_steps = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    order_index = models.IntegerField(default=0)

    class Meta:
        ordering = ["game_type", "difficulty", "order_index"]

    def __str__(self) -> str:
        return self.title


class Submission(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submissions")
    level = models.ForeignKey(Level, on_delete=models.RESTRICT, related_name="submissions")
    moves = models.JSONField(default=list)
    score = models.PositiveSmallIntegerField(default=0)
    stars = models.PositiveSmallIntegerField(default=0)
    time_elapsed = models.PositiveIntegerField(default=0)
    hints_used = models.PositiveSmallIntegerField(default=0)
    is_best = models.BooleanField(default=False)
    optimal_steps = models.PositiveIntegerField(default=0)
    user_steps = models.PositiveIntegerField(default=0)
    diff = models.JSONField(default=list)
    optimal_moves = models.JSONField(default=list)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Submission<{self.id}>"
