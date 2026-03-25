from __future__ import annotations

from rest_framework import serializers

from game.models import Level, Submission

MAX_MOVES_PER_REQUEST = 1000


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


class SwapMoveSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["swap"])
    indices = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        min_length=2,
        max_length=2,
    )


class PathCellMoveSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["path_cell"])
    cell = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        min_length=2,
        max_length=2,
    )


class GraphVisitMoveSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["graph_visit"])
    node = serializers.CharField(max_length=64)


def validate_moves_for_game_type(game_type: str, moves: list[dict]) -> list[dict]:
    if len(moves) > MAX_MOVES_PER_REQUEST:
        raise serializers.ValidationError({"moves": [f"Move payload exceeds the maximum of {MAX_MOVES_PER_REQUEST} events."]})

    serializer_by_game_type = {
        Level.GameType.SORTING: SwapMoveSerializer,
        Level.GameType.PATHFINDING: PathCellMoveSerializer,
        Level.GameType.GRAPH_TRAVERSAL: GraphVisitMoveSerializer,
    }
    serializer_class = serializer_by_game_type.get(game_type)
    if not serializer_class:
        raise serializers.ValidationError({"detail": "Unsupported game type for move validation."})

    validated_moves = []
    for index, move in enumerate(moves):
        serializer = serializer_class(data=move)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as exc:
            raise serializers.ValidationError({"moves": {index: exc.detail}}) from exc
        validated_moves.append(serializer.validated_data)
    return validated_moves


class HintRequestSerializer(serializers.Serializer):
    session_id = serializers.CharField(max_length=128)
    moves = serializers.ListField(child=serializers.DictField(), allow_empty=True)


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
            "diff",
        ]


class ReplayLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ["id", "title", "game_type", "difficulty"]


class ReplaySerializer(serializers.ModelSerializer):
    level = ReplayLevelSerializer(read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "level",
            "moves",
            "optimal_moves",
            "diff",
            "score",
            "stars",
            "time_elapsed",
            "hints_used",
            "optimal_steps",
            "user_steps",
            "created_at",
        ]
