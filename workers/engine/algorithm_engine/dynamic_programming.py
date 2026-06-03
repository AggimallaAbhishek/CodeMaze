"""Dynamic Programming solvers for the Algorithm Puzzle Engine.

Each public solver returns a dict with:
    - ``table``: the completed DP table (1-D list or 2-D list of lists).
    - ``steps``: ordered list of cell-fill dicts the user must reproduce.
      Each step is ``{"row": int, "col": int, "value": int|float}``.
    - ``base_cases``: list of step dicts that are given for free (pre-filled).

The separation of *base_cases* from *steps* lets the UI pre-populate known
cells while still scoring the user only on the cells they must compute.
"""

from __future__ import annotations

import math
from typing import Any


# ---------------------------------------------------------------------------
# 1-D solvers
# ---------------------------------------------------------------------------

def solve_fibonacci(n: int) -> dict[str, Any]:
    """Tabulate Fibonacci(0) … Fibonacci(n).

    Config requirements: ``{"problem_type": "fibonacci", "n": int}``.
    """
    if n < 0:
        raise ValueError("n must be non-negative")

    table = [0] * (n + 1)
    base_cases: list[dict] = [{"row": 0, "col": 0, "value": 0}]
    steps: list[dict] = []

    if n == 0:
        return {"table": table, "steps": steps, "base_cases": base_cases}

    table[1] = 1
    base_cases.append({"row": 0, "col": 1, "value": 1})

    for i in range(2, n + 1):
        table[i] = table[i - 1] + table[i - 2]
        steps.append({"row": 0, "col": i, "value": table[i]})

    return {"table": table, "steps": steps, "base_cases": base_cases}


def solve_coin_change(coins: list[int], target: int) -> dict[str, Any]:
    """Tabulate minimum coins needed for amounts 0 … *target*.

    Config: ``{"problem_type": "coin_change", "coins": [...], "target": int}``.
    Uses ``-1`` to represent *impossible* amounts (mirrors LeetCode convention).
    """
    if target < 0:
        raise ValueError("target must be non-negative")
    if not coins or any(c <= 0 for c in coins):
        raise ValueError("coins must be a non-empty list of positive integers")

    INF = float("inf")
    table = [0] + [INF] * target
    base_cases: list[dict] = [{"row": 0, "col": 0, "value": 0}]
    steps: list[dict] = []

    for amount in range(1, target + 1):
        for coin in coins:
            if coin <= amount and table[amount - coin] != INF:
                table[amount] = min(table[amount], table[amount - coin] + 1)
        cell_value = int(table[amount]) if table[amount] != INF else -1
        steps.append({"row": 0, "col": amount, "value": cell_value})

    # Finalize table for JSON (replace inf with -1)
    table = [int(v) if v != INF else -1 for v in table]
    return {"table": table, "steps": steps, "base_cases": base_cases}


# ---------------------------------------------------------------------------
# 2-D solvers
# ---------------------------------------------------------------------------

def solve_knapsack(weights: list[int], values: list[int], capacity: int) -> dict[str, Any]:
    """0/1 Knapsack via bottom-up tabulation.

    Config: ``{"problem_type": "knapsack", "weights": [...], "values": [...], "capacity": int}``.
    Table dimensions: ``(len(items)+1) x (capacity+1)``.
    """
    if len(weights) != len(values):
        raise ValueError("weights and values must have the same length")
    if capacity < 0:
        raise ValueError("capacity must be non-negative")

    n = len(weights)
    rows = n + 1
    cols = capacity + 1
    table = [[0] * cols for _ in range(rows)]

    # Row 0 and col 0 are all zeros → base cases
    base_cases: list[dict] = []
    for c in range(cols):
        base_cases.append({"row": 0, "col": c, "value": 0})
    for r in range(1, rows):
        base_cases.append({"row": r, "col": 0, "value": 0})

    steps: list[dict] = []
    for i in range(1, rows):
        for w in range(1, cols):
            if weights[i - 1] <= w:
                table[i][w] = max(
                    table[i - 1][w],
                    table[i - 1][w - weights[i - 1]] + values[i - 1],
                )
            else:
                table[i][w] = table[i - 1][w]
            steps.append({"row": i, "col": w, "value": table[i][w]})

    return {"table": table, "steps": steps, "base_cases": base_cases}


def solve_grid_traveler(rows: int, cols: int) -> dict[str, Any]:
    """Count unique paths from top-left to bottom-right (only right/down moves).

    Config: ``{"problem_type": "grid_traveler", "rows": int, "cols": int}``.
    """
    if rows <= 0 or cols <= 0:
        raise ValueError("rows and cols must be positive")

    table = [[0] * cols for _ in range(rows)]

    # First row and first column are all 1 → base cases
    base_cases: list[dict] = []
    for c in range(cols):
        table[0][c] = 1
        base_cases.append({"row": 0, "col": c, "value": 1})
    for r in range(1, rows):
        table[r][0] = 1
        base_cases.append({"row": r, "col": 0, "value": 1})

    steps: list[dict] = []
    for r in range(1, rows):
        for c in range(1, cols):
            table[r][c] = table[r - 1][c] + table[r][c - 1]
            steps.append({"row": r, "col": c, "value": table[r][c]})

    return {"table": table, "steps": steps, "base_cases": base_cases}


# ---------------------------------------------------------------------------
# Public dispatcher (mirrors sorting.py / pathfinding.py pattern)
# ---------------------------------------------------------------------------

_SOLVERS = {
    "fibonacci": lambda cfg: solve_fibonacci(cfg["n"]),
    "coin_change": lambda cfg: solve_coin_change(cfg["coins"], cfg["target"]),
    "knapsack": lambda cfg: solve_knapsack(cfg["weights"], cfg["values"], cfg["capacity"]),
    "grid_traveler": lambda cfg: solve_grid_traveler(cfg["rows"], cfg["cols"]),
}


def solve_dp(level_config: dict) -> dict[str, Any]:
    """Solve a DP problem described by *level_config*.

    ``level_config`` must contain a ``"problem_type"`` key matching one of
    the registered solvers.

    Returns ``{"table": ..., "steps": [...], "base_cases": [...]}``.
    """
    problem_type = level_config.get("problem_type")
    solver = _SOLVERS.get(problem_type)  # type: ignore[arg-type]
    if solver is None:
        supported = ", ".join(sorted(_SOLVERS))
        raise ValueError(
            f"Unsupported DP problem_type '{problem_type}'. "
            f"Supported: {supported}"
        )
    return solver(level_config)
