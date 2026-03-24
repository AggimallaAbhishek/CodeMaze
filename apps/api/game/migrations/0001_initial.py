# Generated manually for initial schema.

import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Level",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "title",
                    models.CharField(max_length=255),
                ),
                (
                    "game_type",
                    models.CharField(
                        choices=[
                            ("sorting", "Sorting"),
                            ("pathfinding", "Pathfinding"),
                            ("graph_traversal", "Graph Traversal"),
                        ],
                        max_length=32,
                    ),
                ),
                (
                    "difficulty",
                    models.PositiveSmallIntegerField(
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(5),
                        ]
                    ),
                ),
                (
                    "config",
                    models.JSONField(default=dict),
                ),
                (
                    "optimal_steps",
                    models.PositiveIntegerField(default=0),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True),
                ),
                (
                    "order_index",
                    models.IntegerField(default=0),
                ),
            ],
            options={
                "ordering": ["game_type", "difficulty", "order_index"],
            },
        ),
        migrations.CreateModel(
            name="Submission",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "moves",
                    models.JSONField(default=list),
                ),
                (
                    "score",
                    models.PositiveSmallIntegerField(default=0),
                ),
                (
                    "stars",
                    models.PositiveSmallIntegerField(default=0),
                ),
                (
                    "time_elapsed",
                    models.PositiveIntegerField(default=0),
                ),
                (
                    "hints_used",
                    models.PositiveSmallIntegerField(default=0),
                ),
                (
                    "is_best",
                    models.BooleanField(default=False),
                ),
                (
                    "optimal_steps",
                    models.PositiveIntegerField(default=0),
                ),
                (
                    "user_steps",
                    models.PositiveIntegerField(default=0),
                ),
                (
                    "diff",
                    models.JSONField(default=list),
                ),
                (
                    "optimal_moves",
                    models.JSONField(default=list),
                ),
                (
                    "level",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="submissions",
                        to="game.level",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="submissions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
