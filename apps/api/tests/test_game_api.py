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
