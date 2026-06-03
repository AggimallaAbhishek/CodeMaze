"""Tests for the dynamic programming engine module."""

from __future__ import annotations

import pytest

from algorithm_engine.dynamic_programming import (
    solve_coin_change,
    solve_dp,
    solve_fibonacci,
    solve_grid_traveler,
    solve_knapsack,
)


# ---------------------------------------------------------------------------
# Fibonacci
# ---------------------------------------------------------------------------

def test_fibonacci_base():
    result = solve_fibonacci(0)
    assert result["table"] == [0]
    assert result["steps"] == []
    assert len(result["base_cases"]) == 1


def test_fibonacci_small():
    result = solve_fibonacci(6)
    assert result["table"] == [0, 1, 1, 2, 3, 5, 8]
    assert len(result["steps"]) == 5  # cells 2 through 6
    assert result["steps"][0] == {"row": 0, "col": 2, "value": 1}
    assert result["steps"][-1] == {"row": 0, "col": 6, "value": 8}


def test_fibonacci_negative_raises():
    with pytest.raises(ValueError, match="non-negative"):
        solve_fibonacci(-1)


# ---------------------------------------------------------------------------
# Coin Change
# ---------------------------------------------------------------------------

def test_coin_change_simple():
    result = solve_coin_change([1, 3, 4], 6)
    assert result["table"][0] == 0
    assert result["table"][6] == 2  # 3 + 3
    assert len(result["steps"]) == 6


def test_coin_change_impossible():
    result = solve_coin_change([3, 5], 1)
    assert result["table"][1] == -1


def test_coin_change_bad_coins_raises():
    with pytest.raises(ValueError, match="positive"):
        solve_coin_change([], 5)


# ---------------------------------------------------------------------------
# Knapsack
# ---------------------------------------------------------------------------

def test_knapsack_basic():
    result = solve_knapsack([2, 3, 4], [3, 4, 5], 5)
    table = result["table"]
    assert table[0] == [0, 0, 0, 0, 0, 0]  # row 0 all zeros
    assert table[3][5] == 7  # items of weight 2+3 → values 3+4
    assert len(result["base_cases"]) == 6 + 3  # 6 cols for row 0 + 3 rows col 0


def test_knapsack_mismatched_raises():
    with pytest.raises(ValueError, match="same length"):
        solve_knapsack([1, 2], [10], 5)


# ---------------------------------------------------------------------------
# Grid Traveler
# ---------------------------------------------------------------------------

def test_grid_traveler_basic():
    result = solve_grid_traveler(3, 3)
    table = result["table"]
    assert table[0] == [1, 1, 1]
    assert table[2][2] == 6  # 6 unique paths in a 3×3 grid
    assert len(result["steps"]) == 4  # 2×2 interior cells


def test_grid_traveler_single_row():
    result = solve_grid_traveler(1, 5)
    assert result["table"] == [[1, 1, 1, 1, 1]]
    assert result["steps"] == []  # everything is a base case


def test_grid_traveler_invalid_raises():
    with pytest.raises(ValueError, match="positive"):
        solve_grid_traveler(0, 3)


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def test_solve_dp_routes_correctly():
    result = solve_dp({"problem_type": "fibonacci", "n": 4})
    assert result["table"] == [0, 1, 1, 2, 3]


def test_solve_dp_unknown_type_raises():
    with pytest.raises(ValueError, match="Unsupported"):
        solve_dp({"problem_type": "bogus"})
