from __future__ import annotations

from django.core.management import call_command

import pytest

from game.models import Level


@pytest.mark.django_db
def test_seed_default_levels_is_idempotent():
    call_command("seed_default_levels")
    first_count = Level.objects.count()

    call_command("seed_default_levels")
    second_count = Level.objects.count()

    assert first_count == 16
    assert second_count == 16
    assert Level.objects.filter(game_type=Level.GameType.SORTING).count() == 10
    assert Level.objects.filter(game_type=Level.GameType.PATHFINDING).count() == 3
    assert Level.objects.filter(game_type=Level.GameType.GRAPH_TRAVERSAL).count() == 3
