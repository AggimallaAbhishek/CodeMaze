from __future__ import annotations

import pytest

from game.models import Level
from leaderboard.services import update_leaderboards


@pytest.mark.django_db
def test_public_leaderboard_returns_entries(client, user):
    level = Level.objects.create(
        title="Sorting Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )

    update_leaderboards(str(user.id), str(level.id), 90)

    response = client.get("/api/v1/leaderboard")
    assert response.status_code == 200
    assert "entries" in response.data


@pytest.mark.django_db
def test_level_leaderboard_returns_entries(client, user):
    level = Level.objects.create(
        title="Sorting Test",
        game_type=Level.GameType.SORTING,
        difficulty=1,
        config={"algorithm": "selection", "array": [3, 1, 2]},
        optimal_steps=2,
        is_active=True,
        order_index=1,
    )

    update_leaderboards(str(user.id), str(level.id), 80)
    response = client.get(f"/api/v1/leaderboard/levels/{level.id}")
    assert response.status_code == 200
    assert response.data["level_id"] == str(level.id)
