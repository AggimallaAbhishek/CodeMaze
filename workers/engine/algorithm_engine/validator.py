from __future__ import annotations

from dataclasses import dataclass

from algorithm_engine.graphs import bfs_traversal, dfs_traversal
from algorithm_engine.pathfinding import bfs_shortest_path, dijkstra_shortest_path
from algorithm_engine.sorting import apply_swap_moves, bubble_sort, quick_sort, selection_sort


@dataclass
class ScoreBreakdown:
    base_score: float
    time_bonus: float
    hint_penalty: float
    final_score: int


def _stars_for_score(score: int) -> int:
    if score >= 85:
        return 3
    if score >= 60:
        return 2
    if score >= 1:
        return 1
    return 0


def _score(optimal_steps: int, user_steps: int, hints_used: int, time_elapsed: int, solved: bool) -> ScoreBreakdown:
    if not solved:
        return ScoreBreakdown(base_score=0.0, time_bonus=0.0, hint_penalty=float(hints_used * 10), final_score=0)

    user_steps_safe = max(user_steps, 1)
    base_score = (optimal_steps / user_steps_safe) * 100 if optimal_steps else 100
    time_bonus = max(0, 20 - (time_elapsed / 10))
    hint_penalty = hints_used * 10
    final_score = int(max(0, min(100, base_score + time_bonus) - hint_penalty))
    return ScoreBreakdown(
        base_score=base_score,
        time_bonus=time_bonus,
        hint_penalty=hint_penalty,
        final_score=final_score,
    )


def _sorting_solution(level_config: dict) -> dict:
    algorithm = level_config.get("algorithm", "selection")
    array = level_config.get("array", [])

    if algorithm == "bubble":
        return bubble_sort(array)
    if algorithm == "quick":
        return quick_sort(array)
    return selection_sort(array)


def _validate_sorting(user_moves: list[dict], level_config: dict, hints_used: int, time_elapsed: int) -> dict:
    initial = level_config.get("array", [])
    optimal = _sorting_solution(level_config)
    optimal_moves = optimal["steps"]
    user_final = apply_swap_moves(initial, user_moves)
    solved = user_final == sorted(initial)

    max_len = max(len(user_moves), len(optimal_moves))
    diff = []
    for index in range(max_len):
        expected = optimal_moves[index] if index < len(optimal_moves) else None
        received = user_moves[index] if index < len(user_moves) else None
        correct = expected == received
        diff.append(
            {
                "step": index + 1,
                "correct": correct,
                "expected": expected,
                "received": received,
            }
        )

    breakdown = _score(
        optimal_steps=len(optimal_moves),
        user_steps=len(user_moves),
        hints_used=hints_used,
        time_elapsed=time_elapsed,
        solved=solved,
    )

    return {
        "score": breakdown.final_score,
        "stars": _stars_for_score(breakdown.final_score),
        "optimal_steps": len(optimal_moves),
        "user_steps": len(user_moves),
        "optimal_moves": optimal_moves,
        "diff": diff,
        "solved": solved,
        "score_breakdown": {
            "base_score": round(breakdown.base_score, 2),
            "time_bonus": round(breakdown.time_bonus, 2),
            "hint_penalty": round(breakdown.hint_penalty, 2),
        },
    }


def _normalize_cell(cell: list[int] | tuple[int, int] | None) -> tuple[int, int] | None:
    if not isinstance(cell, (list, tuple)) or len(cell) != 2:
        return None
    row, col = cell
    if not isinstance(row, int) or not isinstance(col, int):
        return None
    return (row, col)


def _is_walkable(grid: list[list[int]], cell: tuple[int, int]) -> bool:
    if not grid or not grid[0]:
        return False
    row, col = cell
    return 0 <= row < len(grid) and 0 <= col < len(grid[0]) and grid[row][col] != 1


def _are_adjacent(source: tuple[int, int], target: tuple[int, int]) -> bool:
    return abs(source[0] - target[0]) + abs(source[1] - target[1]) == 1


def _extract_user_path(user_moves: list[dict]) -> tuple[list[tuple[int, int]], bool]:
    path: list[tuple[int, int]] = []
    for move in user_moves:
        if move.get("type") != "path_cell":
            continue
        cell = _normalize_cell(move.get("cell"))
        if cell is None:
            return [], False
        path.append(cell)
    return path, True


def _validate_pathfinding(user_moves: list[dict], level_config: dict, hints_used: int, time_elapsed: int) -> dict:
    grid = level_config.get("grid", [])
    start = tuple(level_config.get("start", [0, 0]))
    end = tuple(level_config.get("end", [0, 0]))
    weighted = level_config.get("weighted", False)

    if weighted:
        weights = level_config.get("weights", [[1 for _ in row] for row in grid])
        optimal_path = dijkstra_shortest_path(grid, weights, start, end)
    else:
        optimal_path = bfs_shortest_path(grid, start, end)

    user_path, path_payload_valid = _extract_user_path(user_moves)
    path_starts_correctly = bool(user_path) and user_path[0] == start
    path_ends_correctly = bool(user_path) and user_path[-1] == end
    path_cells_valid = bool(user_path) and all(_is_walkable(grid, cell) for cell in user_path)
    path_steps_adjacent = all(_are_adjacent(user_path[index], user_path[index + 1]) for index in range(len(user_path) - 1))

    solved = (
        bool(optimal_path)
        and path_payload_valid
        and path_starts_correctly
        and path_ends_correctly
        and path_cells_valid
        and path_steps_adjacent
    )

    breakdown = _score(
        optimal_steps=len(optimal_path),
        user_steps=len(user_path),
        hints_used=hints_used,
        time_elapsed=time_elapsed,
        solved=solved,
    )

    return {
        "score": breakdown.final_score,
        "stars": _stars_for_score(breakdown.final_score),
        "optimal_steps": len(optimal_path),
        "user_steps": len(user_path),
        "optimal_moves": [{"type": "path_cell", "cell": list(cell)} for cell in optimal_path],
        "diff": [],
        "solved": solved,
        "score_breakdown": {
            "base_score": round(breakdown.base_score, 2),
            "time_bonus": round(breakdown.time_bonus, 2),
            "hint_penalty": round(breakdown.hint_penalty, 2),
        },
    }


def _validate_graph(user_moves: list[dict], level_config: dict, hints_used: int, time_elapsed: int) -> dict:
    adjacency = level_config.get("adjacency", {})
    start = level_config.get("start")
    mode = level_config.get("mode", "bfs")

    if mode == "dfs":
        optimal_order = dfs_traversal(adjacency, start)
    else:
        optimal_order = bfs_traversal(adjacency, start)

    user_order = [move.get("node") for move in user_moves if move.get("type") == "graph_visit"]
    solved = user_order == optimal_order

    breakdown = _score(
        optimal_steps=len(optimal_order),
        user_steps=len(user_order),
        hints_used=hints_used,
        time_elapsed=time_elapsed,
        solved=solved,
    )

    return {
        "score": breakdown.final_score,
        "stars": _stars_for_score(breakdown.final_score),
        "optimal_steps": len(optimal_order),
        "user_steps": len(user_order),
        "optimal_moves": [{"type": "graph_visit", "node": node} for node in optimal_order],
        "diff": [],
        "solved": solved,
        "score_breakdown": {
            "base_score": round(breakdown.base_score, 2),
            "time_bonus": round(breakdown.time_bonus, 2),
            "hint_penalty": round(breakdown.hint_penalty, 2),
        },
    }


def validate_submission(
    game_type: str,
    user_moves: list[dict],
    level_config: dict,
    hints_used: int = 0,
    time_elapsed: int = 0,
) -> dict:
    if game_type == "sorting":
        return _validate_sorting(user_moves, level_config, hints_used, time_elapsed)
    if game_type == "pathfinding":
        return _validate_pathfinding(user_moves, level_config, hints_used, time_elapsed)
    if game_type == "graph_traversal":
        return _validate_graph(user_moves, level_config, hints_used, time_elapsed)
    raise ValueError(f"Unsupported game type: {game_type}")
