from __future__ import annotations

from datetime import timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone
from redis.exceptions import RedisError

from game.models import GameSession, Level, Submission
from game.serializers import MAX_MOVES_PER_REQUEST


@pytest.mark.django_db
def test_public_levels_list(client):
    Level.objects.create(
        title="Sorting Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )

    response = client.get("/api/v1/levels")
    assert response.status_code == 200
    assert len(response.data) == 1


@pytest.mark.django_db
def test_public_levels_list_filters_by_numeric_difficulty(client):
    Level.objects.create(
        title="Easy Sorting",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "bubble", "array": [3, 2, 1]},
        optimal_steps=3,
        is_active=True,
        order_index=1,
    )
    Level.objects.create(
        title="Hard Sorting",
        game_type=Level.GameType.SORTING,
        difficulty=5,
        config={"algorithm": "quick", "array": [8, 1, 7, 2, 6]},
        optimal_steps=4,
        is_active=True,
        order_index=2,
    )

    response = client.get("/api/v1/levels?game_type=sorting&difficulty=5")
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["title"] == "Hard Sorting"


@pytest.mark.django_db
def test_public_levels_list_filters_by_label_difficulty(client):
    Level.objects.create(
        title="Easy Sorting",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "bubble", "array": [3, 2, 1]},
        optimal_steps=3,
        is_active=True,
        order_index=1,
    )
    Level.objects.create(
        title="Medium Sorting",
        game_type=Level.GameType.SORTING,
        difficulty=3,
        config={"algorithm": "selection", "array": [4, 1, 3, 2]},
        optimal_steps=3,
        is_active=True,
        order_index=2,
    )

    response = client.get("/api/v1/levels?game_type=sorting&difficulty=easy")
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["title"] == "Easy Sorting"


@pytest.mark.django_db
def test_public_levels_list_rejects_invalid_difficulty(client):
    response = client.get("/api/v1/levels?difficulty=impossible")
    assert response.status_code == 400
    assert "difficulty" in response.data


@pytest.mark.django_db
def test_sorting_submission_flow(auth_client, user):
    level = Level.objects.create(
        title="Sorting Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )

    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    submission_response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [
                {"type": "swap", "indices": [0, 1]},
                {"type": "swap", "indices": [1, 2]},
            ],
            "hints_used": 0,
            "time_elapsed": 20,
        },
        format="json",
    )

    assert submission_response.status_code == 201
    assert "submission_id" in submission_response.data
    assert "score" in submission_response.data
    assert "stars" in submission_response.data

    me_response = auth_client.get("/api/v1/submissions/me")
    assert me_response.status_code == 200
    assert len(me_response.data) == 1


@pytest.mark.django_db
def test_sorting_submission_updates_total_xp_and_single_personal_best(auth_client, user):
    level = Level.objects.create(
        title="Sorting XP Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=2,
    )

    first_start = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert first_start.status_code == 201
    first_submission = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": first_start.data["session_id"],
            "level_id": str(level.id),
            "moves": [{"type": "swap", "indices": [0, 2]}],
            "hints_used": 0,
            "time_elapsed": 3,
        },
        format="json",
    )
    assert first_submission.status_code == 201
    assert first_submission.data["total_xp"] == 0

    second_start = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert second_start.status_code == 201
    second_submission = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": second_start.data["session_id"],
            "level_id": str(level.id),
            "moves": [
                {"type": "swap", "indices": [0, 1]},
                {"type": "swap", "indices": [1, 2]},
            ],
            "hints_used": 0,
            "time_elapsed": 0,
        },
        format="json",
    )

    assert second_submission.status_code == 201
    assert second_submission.data["total_xp"] == 200

    user.refresh_from_db()
    assert user.total_xp == 200
    assert Submission.objects.filter(user=user, level=level, is_best=True).count() == 1
    assert Submission.objects.get(user=user, level=level, is_best=True).score == 100


@pytest.mark.django_db
def test_submission_schedules_leaderboard_update_after_commit(auth_client, user, monkeypatch, django_capture_on_commit_callbacks):
    level = Level.objects.create(
        title="Sorting Leaderboard Commit Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=3,
    )
    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    leaderboard_calls = []

    def record_leaderboard_update(*, user_id, level_id, score):
        leaderboard_calls.append({"user_id": user_id, "level_id": level_id, "score": score})

    monkeypatch.setattr("game.views.update_leaderboards", record_leaderboard_update)

    with django_capture_on_commit_callbacks(execute=False) as callbacks:
        submission_response = auth_client.post(
            "/api/v1/submissions",
            {
                "session_id": start_response.data["session_id"],
                "level_id": str(level.id),
                "moves": [
                    {"type": "swap", "indices": [0, 1]},
                    {"type": "swap", "indices": [1, 2]},
                ],
                "hints_used": 0,
                "time_elapsed": 0,
            },
            format="json",
        )

    assert submission_response.status_code == 201
    assert len(callbacks) == 1
    assert leaderboard_calls == []

    callbacks[0]()
    assert leaderboard_calls == [{"user_id": str(user.id), "level_id": str(level.id), "score": 100}]


@pytest.mark.django_db
def test_submission_model_enforces_single_best_submission_per_level(user):
    level = Level.objects.create(
        title="Sorting Best Constraint Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=4,
    )

    Submission.objects.create(
        user=user,
        level=level,
        moves=[{"type": "swap", "indices": [0, 1]}],
        score=60,
        stars=2,
        time_elapsed=10,
        hints_used=0,
        optimal_steps=2,
        user_steps=1,
        diff=[],
        optimal_moves=[],
        is_best=True,
    )

    with pytest.raises(IntegrityError):
        Submission.objects.create(
            user=user,
            level=level,
            moves=[{"type": "swap", "indices": [1, 2]}],
            score=70,
            stars=2,
            time_elapsed=8,
            hints_used=0,
            optimal_steps=2,
            user_steps=1,
            diff=[],
            optimal_moves=[],
            is_best=True,
        )


@pytest.mark.django_db
def test_pathfinding_submission_flow(auth_client):
    level = Level.objects.create(
        title="Pathfinding Test",
        game_type=Level.GameType.PATHFINDING,
        difficulty=2,
        config={
            "grid": [
                [0, 0, 0],
                [1, 1, 0],
                [0, 0, 0],
            ],
            "start": [0, 0],
            "end": [2, 2],
            "weighted": False,
            "mode": "bfs",
        },
        optimal_steps=5,
        is_active=True,
        order_index=1,
    )

    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    submission_response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [
                {"type": "path_cell", "cell": [0, 0]},
                {"type": "path_cell", "cell": [0, 1]},
                {"type": "path_cell", "cell": [0, 2]},
                {"type": "path_cell", "cell": [1, 2]},
                {"type": "path_cell", "cell": [2, 2]},
            ],
            "hints_used": 0,
            "time_elapsed": 20,
        },
        format="json",
    )

    assert submission_response.status_code == 201
    assert submission_response.data["optimal_steps"] == 5
    assert submission_response.data["user_steps"] == 5
    assert submission_response.data["score"] > 0
    assert "score_breakdown" in submission_response.data


@pytest.mark.django_db
def test_pathfinding_submission_revalidates_illegal_jumps(auth_client):
    level = Level.objects.create(
        title="Pathfinding Invalid Path Test",
        game_type=Level.GameType.PATHFINDING,
        difficulty=2,
        config={
            "grid": [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0],
            ],
            "start": [0, 0],
            "end": [0, 2],
            "weighted": False,
            "mode": "bfs",
        },
        optimal_steps=3,
        is_active=True,
        order_index=2,
    )

    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    submission_response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [
                {"type": "path_cell", "cell": [0, 0]},
                {"type": "path_cell", "cell": [0, 2]},
            ],
            "hints_used": 0,
            "time_elapsed": 5,
        },
        format="json",
    )

    assert submission_response.status_code == 201
    assert submission_response.data["score"] == 0


@pytest.mark.django_db
def test_graph_submission_flow(auth_client):
    level = Level.objects.create(
        title="Graph Traversal Test",
        game_type=Level.GameType.GRAPH_TRAVERSAL,
        difficulty=2,
        config={
            "adjacency": {
                "A": ["B", "C"],
                "B": ["D"],
                "C": [],
                "D": [],
            },
            "start": "A",
            "mode": "bfs",
        },
        optimal_steps=4,
        is_active=True,
        order_index=3,
    )

    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    submission_response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [
                {"type": "graph_visit", "node": "A"},
                {"type": "graph_visit", "node": "B"},
                {"type": "graph_visit", "node": "C"},
                {"type": "graph_visit", "node": "D"},
            ],
            "hints_used": 0,
            "time_elapsed": 15,
        },
        format="json",
    )

    assert submission_response.status_code == 201
    assert submission_response.data["optimal_steps"] == 4
    assert submission_response.data["user_steps"] == 4
    assert submission_response.data["score"] > 0
    assert "score_breakdown" in submission_response.data


@pytest.mark.django_db
def test_graph_submission_rejects_wrong_traversal_order(auth_client):
    level = Level.objects.create(
        title="Graph Traversal Wrong Order",
        game_type=Level.GameType.GRAPH_TRAVERSAL,
        difficulty=2,
        config={
            "adjacency": {
                "A": ["B", "C"],
                "B": ["D"],
                "C": [],
                "D": [],
            },
            "start": "A",
            "mode": "dfs",
        },
        optimal_steps=4,
        is_active=True,
        order_index=4,
    )

    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    submission_response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [
                {"type": "graph_visit", "node": "A"},
                {"type": "graph_visit", "node": "C"},
                {"type": "graph_visit", "node": "B"},
                {"type": "graph_visit", "node": "D"},
            ],
            "hints_used": 0,
            "time_elapsed": 15,
        },
        format="json",
    )

    assert submission_response.status_code == 201
    assert submission_response.data["score"] == 0


@pytest.mark.django_db
def test_start_level_requires_authentication(client):
    level = Level.objects.create(
        title="Sorting Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )
    response = client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_submission_rejects_invalid_session(auth_client):
    level = Level.objects.create(
        title="Sorting Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )
    response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": "sess_invalid",
            "level_id": str(level.id),
            "moves": [],
            "hints_used": 0,
            "time_elapsed": 0,
        },
        format="json",
    )
    assert response.status_code == 400
    assert response.data["detail"] == "Invalid or expired session."


@pytest.mark.django_db
def test_db_backed_game_session_allows_submission_when_redis_is_unavailable(auth_client, monkeypatch):
    level = Level.objects.create(
        title="Session Fallback Sorting",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=5,
    )

    def raise_redis_error():
        raise RedisError("redis offline")

    monkeypatch.setattr("game.services.get_redis_client", raise_redis_error)

    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201
    assert GameSession.objects.filter(session_id=start_response.data["session_id"]).exists()

    submission_response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [
                {"type": "swap", "indices": [0, 1]},
                {"type": "swap", "indices": [1, 2]},
            ],
            "hints_used": 0,
            "time_elapsed": 0,
        },
        format="json",
    )

    assert submission_response.status_code == 201
    assert submission_response.data["score"] == 100


@pytest.mark.django_db
def test_submission_rejects_expired_database_backed_session(auth_client, user):
    level = Level.objects.create(
        title="Expired Session Sorting",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=6,
    )
    session = GameSession.objects.create(
        session_id="sess_expired_case",
        user=user,
        level=level,
        hints_used=0,
        expires_at=timezone.now() - timedelta(seconds=1),
    )

    response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": session.session_id,
            "level_id": str(level.id),
            "moves": [],
            "hints_used": 0,
            "time_elapsed": 0,
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.data["detail"] == "Invalid or expired session."


@pytest.mark.django_db
def test_submission_rejects_malformed_payload(auth_client):
    response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": "sess_invalid",
            "moves": [],
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_submission_rejects_invalid_sorting_move_shape(auth_client):
    level = Level.objects.create(
        title="Sorting Validation Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=7,
    )
    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [{"type": "swap", "indices": [0]}],
            "hints_used": 0,
            "time_elapsed": 0,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "moves" in response.data


@pytest.mark.django_db
def test_hint_rejects_invalid_pathfinding_move_shape(auth_client):
    level = Level.objects.create(
        title="Pathfinding Hint Validation Test",
        game_type=Level.GameType.PATHFINDING,
        difficulty=2,
        config={
            "grid": [[0, 0], [0, 0]],
            "start": [0, 0],
            "end": [1, 1],
            "weighted": False,
            "mode": "bfs",
        },
        optimal_steps=3,
        is_active=True,
        order_index=8,
    )
    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    response = auth_client.post(
        f"/api/v1/levels/{level.id}/hint",
        {
            "session_id": start_response.data["session_id"],
            "moves": [{"type": "path_cell", "indices": [0, 0]}],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "moves" in response.data


@pytest.mark.django_db
def test_submission_rejects_unknown_move_type_for_game(auth_client):
    level = Level.objects.create(
        title="Graph Validation Test",
        game_type=Level.GameType.GRAPH_TRAVERSAL,
        difficulty=2,
        config={"adjacency": {"A": ["B"], "B": []}, "start": "A", "mode": "bfs"},
        optimal_steps=2,
        is_active=True,
        order_index=9,
    )
    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [{"type": "swap", "indices": [0, 1]}],
            "hints_used": 0,
            "time_elapsed": 0,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "moves" in response.data


@pytest.mark.django_db
def test_submission_rejects_oversized_move_payload(auth_client):
    level = Level.objects.create(
        title="Oversized Sorting Validation Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=10,
    )
    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    response = auth_client.post(
        "/api/v1/submissions",
        {
            "session_id": start_response.data["session_id"],
            "level_id": str(level.id),
            "moves": [{"type": "swap", "indices": [0, 1]}] * (MAX_MOVES_PER_REQUEST + 1),
            "hints_used": 0,
            "time_elapsed": 0,
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.data["moves"][0].startswith("Move payload exceeds")
