from algorithm_engine.validator import validate_submission


def test_validate_sorting_submission_returns_expected_fields():
    level_config = {
        "algorithm": "selection",
        "array": [3, 1, 2],
    }
    result = validate_submission(
        game_type="sorting",
        user_moves=[{"type": "swap", "indices": [0, 1]}, {"type": "swap", "indices": [1, 2]}],
        level_config=level_config,
        hints_used=0,
        time_elapsed=30,
    )

    assert "score" in result
    assert "stars" in result
    assert "optimal_steps" in result
    assert "user_steps" in result
    assert "diff" in result


def test_validate_pathfinding_submission_accepts_valid_contiguous_path():
    level_config = {
        "grid": [
            [0, 0, 0],
            [1, 1, 0],
            [0, 0, 0],
        ],
        "start": [0, 0],
        "end": [2, 2],
        "weighted": False,
    }
    result = validate_submission(
        game_type="pathfinding",
        user_moves=[
            {"type": "path_cell", "cell": [0, 0]},
            {"type": "path_cell", "cell": [0, 1]},
            {"type": "path_cell", "cell": [0, 2]},
            {"type": "path_cell", "cell": [1, 2]},
            {"type": "path_cell", "cell": [2, 2]},
        ],
        level_config=level_config,
        hints_used=0,
        time_elapsed=20,
    )

    assert result["solved"] is True
    assert result["user_steps"] == 5
    assert result["optimal_steps"] == 5
    assert result["score"] > 0


def test_validate_pathfinding_submission_rejects_non_adjacent_jumps():
    level_config = {
        "grid": [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
        ],
        "start": [0, 0],
        "end": [0, 2],
        "weighted": False,
    }
    result = validate_submission(
        game_type="pathfinding",
        user_moves=[
            {"type": "path_cell", "cell": [0, 0]},
            {"type": "path_cell", "cell": [0, 2]},
        ],
        level_config=level_config,
        hints_used=0,
        time_elapsed=5,
    )

    assert result["solved"] is False
    assert result["score"] == 0
