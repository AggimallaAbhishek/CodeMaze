from __future__ import annotations

import logging

from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from algorithm_engine.hints import generate_hint
from algorithm_engine.validator import validate_submission
from game.models import Level, Submission
from game.serializers import (
    HintRequestSerializer,
    LevelDetailSerializer,
    LevelListSerializer,
    ReplaySerializer,
    SubmissionCreateSerializer,
    SubmissionSerializer,
)
from game.services import create_game_session, get_game_session, increment_session_hints
from leaderboard.progression import award_badges_for_submission, build_progression_snapshot
from leaderboard.services import update_leaderboards

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


def _load_valid_session(request, level: Level, session_id: str) -> dict:
    session = get_game_session(session_id)
    if not session:
        logger.warning(
            "session_rejected_expired",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(request.user.id),
                "level_id": str(level.id),
                "session_id": session_id,
            },
        )
        raise ValidationError({"detail": "Invalid or expired session."})

    if session["user_id"] != str(request.user.id) or session["level_id"] != str(level.id):
        logger.warning(
            "session_rejected_mismatch",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(request.user.id),
                "level_id": str(level.id),
                "session_id": session_id,
            },
        )
        raise ValidationError({"detail": "Session does not belong to this user/level."})
    return session


class HintView(APIView):
    throttle_scope = "submissions"

    def post(self, request, level_id):
        serializer = HintRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        level = generics.get_object_or_404(Level, id=level_id, is_active=True)
        session = _load_valid_session(request, level, serializer.validated_data["session_id"])

        try:
            hint = generate_hint(
                game_type=level.game_type,
                level_config=level.config,
                user_moves=serializer.validated_data["moves"],
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        updated_session = increment_session_hints(serializer.validated_data["session_id"])
        hints_used_total = int(updated_session.get("hints_used", 0)) if updated_session else int(session.get("hints_used", 0))

        logger.info(
            "hint_issued",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(request.user.id),
                "level_id": str(level.id),
                "session_id": serializer.validated_data["session_id"],
                "hints_used": hints_used_total,
            },
        )
        return Response(
            {
                "message": hint["message"],
                "preview_move": hint["preview_move"],
                "remaining_optimal_steps": hint["remaining_optimal_steps"],
                "penalty_applied": 10,
                "hints_used_total": hints_used_total,
            },
            status=status.HTTP_200_OK,
        )


class SubmissionCreateView(APIView):
    throttle_scope = "submissions"

    def post(self, request):
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        level = generics.get_object_or_404(Level, id=serializer.validated_data["level_id"], is_active=True)
        session = _load_valid_session(request, level, serializer.validated_data["session_id"])

        user_moves = serializer.validated_data["moves"]
        client_hints_used = serializer.validated_data["hints_used"]
        session_hints_used = int(session.get("hints_used", 0))
        effective_hints_used = max(client_hints_used, session_hints_used)
        time_elapsed = serializer.validated_data["time_elapsed"]

        if client_hints_used != session_hints_used:
            logger.info(
                "submission_hint_count_reconciled",
                extra={
                    "request_id": getattr(request, "request_id", None),
                    "user_id": str(request.user.id),
                    "level_id": str(level.id),
                    "session_id": serializer.validated_data["session_id"],
                    "client_hints_used": client_hints_used,
                    "session_hints_used": session_hints_used,
                    "effective_hints_used": effective_hints_used,
                },
            )

        try:
            result = validate_submission(
                game_type=level.game_type,
                user_moves=user_moves,
                level_config=level.config,
                hints_used=effective_hints_used,
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
                hints_used=effective_hints_used,
                time_elapsed=time_elapsed,
                optimal_steps=result["optimal_steps"],
                user_steps=result["user_steps"],
                diff=result["diff"],
                optimal_moves=result.get("optimal_moves", []),
                is_best=is_personal_best,
            )

            request.user.total_xp += xp_earned
            request.user.save(update_fields=["total_xp"])
            update_leaderboards(user_id=str(request.user.id), level_id=str(level.id), score=score)
            awarded_badges = award_badges_for_submission(user=request.user, level=level, submission=submission)

        progression = build_progression_snapshot(request.user.total_xp)

        logger.info(
            "submission_processed",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": str(request.user.id),
                "level_id": str(level.id),
                "submission_id": str(submission.id),
                "score": score,
                "is_personal_best": is_personal_best,
                "hints_used": effective_hints_used,
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
                "total_xp": request.user.total_xp,
                "progression": progression,
                "hints_used": effective_hints_used,
                "awarded_badges": awarded_badges,
                "is_personal_best": is_personal_best,
                "diff": result["diff"],
                "optimal_moves": result.get("optimal_moves", []),
                "score_breakdown": result["score_breakdown"],
            },
            status=status.HTTP_201_CREATED,
        )


class MySubmissionsView(generics.ListAPIView):
    serializer_class = SubmissionSerializer

    def get_queryset(self):
        queryset = Submission.objects.filter(user=self.request.user).select_related("level")
        level_id = self.request.query_params.get("level_id")
        if level_id:
            queryset = queryset.filter(level_id=level_id)

        if self.request.query_params.get("best") == "true":
            queryset = queryset.filter(is_best=True)

        raw_limit = self.request.query_params.get("limit")
        if raw_limit:
            try:
                limit = min(max(int(raw_limit), 1), 100)
                return queryset[:limit]
            except ValueError as exc:
                raise ValidationError({"limit": "Limit must be an integer between 1 and 100."}) from exc
        return queryset


class SubmissionReplayView(generics.RetrieveAPIView):
    serializer_class = ReplaySerializer

    def get_queryset(self):
        queryset = Submission.objects.select_related("level")
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(Q(user=self.request.user))
