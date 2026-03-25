from __future__ import annotations

import pytest

from game.models import Level, Submission
from leaderboard.services import update_leaderboards
from users.models import User


@pytest.mark.django_db
def test_hint_endpoint_tracks_server_side_penalty_and_submission_uses_it(auth_client):
    level = Level.objects.create(
        title="Sorting Hint Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )

    start_response = auth_client.post(f"/api/v1/levels/{level.id}/start", {}, format="json")
    assert start_response.status_code == 201

    hint_response = auth_client.post(
        f"/api/v1/levels/{level.id}/hint",
        {
            "session_id": start_response.data["session_id"],
            "moves": [],
        },
        format="json",
    )
    assert hint_response.status_code == 200
    assert hint_response.data["hints_used_total"] == 1
    assert hint_response.data["preview_move"] == {"type": "swap", "indices": [0, 1]}

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
    assert submission_response.data["hints_used"] == 1
    assert submission_response.data["score_breakdown"]["hint_penalty"] == 10


@pytest.mark.django_db
def test_submission_replay_includes_level_metadata(auth_client, user):
    level = Level.objects.create(
        title="Replay Test",
        game_type=Level.GameType.GRAPH_TRAVERSAL,
        difficulty=2,
        config={"adjacency": {"A": ["B"], "B": []}, "start": "A", "mode": "bfs"},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )
    submission = Submission.objects.create(
        user=user,
        level=level,
        moves=[{"type": "graph_visit", "node": "A"}, {"type": "graph_visit", "node": "B"}],
        score=100,
        stars=3,
        hints_used=0,
        time_elapsed=4,
        optimal_steps=2,
        user_steps=2,
        diff=[],
        optimal_moves=[{"type": "graph_visit", "node": "A"}, {"type": "graph_visit", "node": "B"}],
        is_best=True,
    )

    response = auth_client.get(f"/api/v1/submissions/{submission.id}/replay")
    assert response.status_code == 200
    assert response.data["level"]["game_type"] == "graph_traversal"
    assert response.data["optimal_steps"] == 2
    assert response.data["user_steps"] == 2


@pytest.mark.django_db
def test_users_me_returns_progression_stats_and_badges(auth_client):
    level = Level.objects.create(
        title="Profile Sorting",
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
            "time_elapsed": 0,
        },
        format="json",
    )
    assert submission_response.status_code == 201
    assert len(submission_response.data["awarded_badges"]) >= 3

    me_response = auth_client.get("/api/v1/users/me")
    assert me_response.status_code == 200
    assert me_response.data["total_xp"] == 200
    assert me_response.data["progression"]["level"] == 2
    assert me_response.data["stats"]["solved_count"] == 1
    assert any(badge["code"] == "first_clear" for badge in me_response.data["badges"])
    assert any(badge["code"] == "sorting_scholar" for badge in me_response.data["badges"])


@pytest.mark.django_db
def test_global_leaderboard_keeps_highest_snapshot_score(client, user):
    level = Level.objects.create(
        title="Leaderboard Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )

    update_leaderboards(str(user.id), str(level.id), 90)
    update_leaderboards(str(user.id), str(level.id), 40)

    response = client.get("/api/v1/leaderboard")
    assert response.status_code == 200
    assert response.data["entries"][0]["score"] == 90


@pytest.mark.django_db
def test_level_leaderboard_returns_authenticated_user_rank(auth_client, user):
    other_user = User.objects.create_user(email="other@example.com", username="otheruser", password="StrongPass123!")
    level = Level.objects.create(
        title="Ranked Test",
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
        order_index=2,
    )

    update_leaderboards(str(other_user.id), str(level.id), 95)
    update_leaderboards(str(user.id), str(level.id), 80)

    response = auth_client.get(f"/api/v1/leaderboard/levels/{level.id}")
    assert response.status_code == 200
    assert response.data["user_rank"] == {"rank": 2, "score": 80}
