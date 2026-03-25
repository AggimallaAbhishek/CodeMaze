from __future__ import annotations

import logging

from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from algorithm_engine.validator import validate_submission
from game.models import Level, Submission
from game.serializers import (
    LevelDetailSerializer,
    LevelListSerializer,
    ReplaySerializer,
    SubmissionCreateSerializer,
    SubmissionSerializer,
)
from game.services import create_game_session, get_game_session

logger = logging.getLogger(__name__)


class LevelListView(generics.ListAPIView):
    serializer_class = LevelListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Level.objects.filter(is_active=True)
        game_type = self.request.query_params.get("game_type")
        difficulty = self.request.query_params.get("difficulty")

        if game_type:
            queryset = queryset.filter(game_type=game_type)
        if difficulty:
            normalized_difficulty = difficulty.strip().lower()
            difficulty_buckets = {
                "easy": [1, 2],
                "medium": [3],
                "hard": [4, 5],
            }
            if normalized_difficulty in difficulty_buckets:
                queryset = queryset.filter(difficulty__in=difficulty_buckets[normalized_difficulty])
            else:
                try:
                    difficulty_value = int(normalized_difficulty)
                except ValueError as exc:
                    logger.warning(
                        "levels_rejected_invalid_difficulty",
                        extra={
                            "request_id": getattr(self.request, "request_id", None),
                            "difficulty": difficulty,
                        },
                    )
                    raise ValidationError({"difficulty": "Difficulty must be 1-5 or one of: easy, medium, hard."}) from exc

                if difficulty_value < 1 or difficulty_value > 5:
                    logger.warning(
                        "levels_rejected_out_of_range_difficulty",
                        extra={
                            "request_id": getattr(self.request, "request_id", None),
                            "difficulty": difficulty,
                        },
                    )
                    raise ValidationError({"difficulty": "Difficulty must be 1-5 or one of: easy, medium, hard."})
                queryset = queryset.filter(difficulty=difficulty_value)
        return queryset


class LevelDetailView(generics.RetrieveAPIView):
    serializer_class = LevelDetailSerializer
    queryset = Level.objects.filter(is_active=True)
    permission_classes = [permissions.AllowAny]


class StartLevelView(APIView):
    def post(self, request, level_id):
        level = generics.get_object_or_404(Level, id=level_id, is_active=True)
        session_id, ttl = create_game_session(str(request.user.id), str(level.id))
        logger.info(
            "level_started",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(request.user.id),
                "level_id": str(level.id),
                "session_id": session_id,
            },
        )
        return Response({"session_id": session_id, "expires_in": ttl}, status=status.HTTP_201_CREATED)


class SubmissionCreateView(APIView):
    throttle_scope = "submissions"

    def post(self, request):
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        level = generics.get_object_or_404(Level, id=serializer.validated_data["level_id"], is_active=True)
        session = get_game_session(serializer.validated_data["session_id"])

        if not session:
            logger.warning(
                "submission_rejected_expired_session",
                extra={
                    "request_id": getattr(request, "request_id", None),
                    "user_id": str(request.user.id),
                    "level_id": str(level.id),
                    "session_id": serializer.validated_data["session_id"],
                },
            )
            return Response({"detail": "Invalid or expired session."}, status=status.HTTP_400_BAD_REQUEST)

        if session["user_id"] != str(request.user.id) or session["level_id"] != str(level.id):
            logger.warning(
                "submission_rejected_session_mismatch",
                extra={
                    "request_id": getattr(request, "request_id", None),
                    "user_id": str(request.user.id),
                    "level_id": str(level.id),
                    "session_id": serializer.validated_data["session_id"],
                },
            )
            return Response({"detail": "Session does not belong to this user/level."}, status=status.HTTP_400_BAD_REQUEST)

        user_moves = serializer.validated_data["moves"]
        hints_used = serializer.validated_data["hints_used"]
        time_elapsed = serializer.validated_data["time_elapsed"]

        try:
            result = validate_submission(
                game_type=level.game_type,
                user_moves=user_moves,
                level_config=level.config,
                hints_used=hints_used,
                time_elapsed=time_elapsed,
            )
        except ValueError as exc:
            logger.warning(
                "submission_rejected_unsupported_game_type",
                extra={
                    "request_id": getattr(request, "request_id", None),
                    "user_id": str(request.user.id),
                    "level_id": str(level.id),
                    "game_type": level.game_type,
                },
            )
            raise ValidationError({"detail": str(exc)}) from exc

        score = result["score"]
        xp_earned = max(0, score * 2)

        with transaction.atomic():
            current_best = (
                Submission.objects.select_for_update()
                .filter(user=request.user, level=level, is_best=True)
                .order_by("-score")
                .first()
            )
            is_personal_best = not current_best or score > current_best.score

            if current_best and is_personal_best:
                current_best.is_best = False
                current_best.save(update_fields=["is_best", "updated_at"])

            submission = Submission.objects.create(
                user=request.user,
                level=level,
                moves=user_moves,
                score=score,
                stars=result["stars"],
                hints_used=hints_used,
                time_elapsed=time_elapsed,
                optimal_steps=result["optimal_steps"],
                user_steps=result["user_steps"],
                diff=result["diff"],
                optimal_moves=result.get("optimal_moves", []),
                is_best=is_personal_best,
            )

            request.user.total_xp += xp_earned
            request.user.save(update_fields=["total_xp"])

            from leaderboard.services import update_leaderboards

            update_leaderboards(user_id=str(request.user.id), level_id=str(level.id), score=score)

        logger.info(
            "submission_processed",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(request.user.id),
                "level_id": str(level.id),
                "submission_id": str(submission.id),
                "score": score,
                "is_personal_best": is_personal_best,
            },
        )

        return Response(
            {
                "submission_id": str(submission.id),
                "score": score,
                "stars": result["stars"],
                "optimal_steps": result["optimal_steps"],
                "user_steps": result["user_steps"],
                "xp_earned": xp_earned,
                "is_personal_best": is_personal_best,
                "diff": result["diff"],
                "score_breakdown": result["score_breakdown"],
            },
            status=status.HTTP_201_CREATED,
        )


class MySubmissionsView(generics.ListAPIView):
    serializer_class = SubmissionSerializer

    def get_queryset(self):
        queryset = Submission.objects.filter(user=self.request.user)
        level_id = self.request.query_params.get("level_id")
        if level_id:
            queryset = queryset.filter(level_id=level_id)
        return queryset


class SubmissionReplayView(generics.RetrieveAPIView):
    serializer_class = ReplaySerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Submission.objects.all()
        return Submission.objects.filter(Q(user=self.request.user))
