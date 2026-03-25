from __future__ import annotations

import pytest

from game.models import Level


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
