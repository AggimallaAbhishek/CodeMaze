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
