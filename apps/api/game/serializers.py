from __future__ import annotations

from rest_framework import serializers

from game.models import Level, Submission


class LevelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ["id", "title", "game_type", "difficulty", "order_index"]


class LevelDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = [
            "id",
            "title",
            "game_type",
            "difficulty",
            "config",
            "optimal_steps",
            "order_index",
        ]


class StartSessionSerializer(serializers.Serializer):
    level_id = serializers.UUIDField()


class SubmissionCreateSerializer(serializers.Serializer):
    session_id = serializers.CharField(max_length=128)
    level_id = serializers.UUIDField()
    moves = serializers.ListField(child=serializers.DictField(), allow_empty=True)
    hints_used = serializers.IntegerField(default=0, min_value=0, max_value=10)
    time_elapsed = serializers.IntegerField(default=0, min_value=0)


class SubmissionSerializer(serializers.ModelSerializer):
    level = LevelListSerializer(read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "level",
            "score",
            "stars",
            "time_elapsed",
            "hints_used",
            "is_best",
            "optimal_steps",
            "user_steps",
            "created_at",
        ]


class ReplaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ["id", "moves", "optimal_moves", "diff", "score", "stars", "created_at"]
