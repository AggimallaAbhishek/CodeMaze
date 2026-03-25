from __future__ import annotations

from algorithm_engine.graphs import bfs_traversal, dfs_traversal
from algorithm_engine.pathfinding import bfs_shortest_path, dijkstra_shortest_path
from algorithm_engine.sorting import apply_swap_moves, bubble_sort, quick_sort, selection_sort


def _sorting_solution(level_config: dict) -> dict:
    algorithm = level_config.get("algorithm", "selection")
    array = level_config.get("array", [])
    if algorithm == "bubble":
        return bubble_sort(array)
    if algorithm == "quick":
        return quick_sort(array)
    return selection_sort(array)


def _sorting_hint(level_config: dict, user_moves: list[dict]) -> dict:
    optimal_moves = _sorting_solution(level_config)["steps"]
    current_step_index = len([move for move in user_moves if move.get("type") == "swap"])
    next_move = optimal_moves[current_step_index] if current_step_index < len(optimal_moves) else None
    if not next_move:
        return {
            "message": "The array already matches the canonical sorted order.",
            "preview_move": None,
            "remaining_optimal_steps": 0,
        }

    current_array = apply_swap_moves(level_config.get("array", []), user_moves)
    left_index, right_index = next_move.get("indices", [0, 0])
    left_value = current_array[left_index] if left_index < len(current_array) else "?"
    right_value = current_array[right_index] if right_index < len(current_array) else "?"
    return {
        "message": f"Swap positions {left_index + 1} and {right_index + 1} to reorder {left_value} and {right_value}.",
        "preview_move": next_move,
        "remaining_optimal_steps": max(len(optimal_moves) - current_step_index, 0),
    }


def _pathfinding_hint(level_config: dict, user_moves: list[dict]) -> dict:
    grid = level_config.get("grid", [])
    start = tuple(level_config.get("start", [0, 0]))
    end = tuple(level_config.get("end", [0, 0]))
    weighted = level_config.get("weighted", False)

    if weighted:
        weights = level_config.get("weights", [[1 for _ in row] for row in grid])
        optimal_path = dijkstra_shortest_path(grid, weights, start, end)
    else:
        optimal_path = bfs_shortest_path(grid, start, end)

    current_step_index = len([move for move in user_moves if move.get("type") == "path_cell"])
    next_cell = optimal_path[current_step_index] if current_step_index < len(optimal_path) else None
    if not next_cell:
        return {
            "message": "You are already on the canonical shortest path endpoint.",
            "preview_move": None,
            "remaining_optimal_steps": 0,
        }

    row, col = next_cell
    return {
        "message": f"Move next to cell ({row + 1}, {col + 1}) to stay on the shortest route.",
        "preview_move": {"type": "path_cell", "cell": [row, col]},
        "remaining_optimal_steps": max(len(optimal_path) - current_step_index, 0),
    }


def _graph_hint(level_config: dict, user_moves: list[dict]) -> dict:
    adjacency = level_config.get("adjacency", {})
    start = level_config.get("start")
    mode = level_config.get("mode", "bfs")

    if mode == "dfs":
        optimal_order = dfs_traversal(adjacency, start)
    else:
        optimal_order = bfs_traversal(adjacency, start)

    current_step_index = len([move for move in user_moves if move.get("type") == "graph_visit"])
    next_node = optimal_order[current_step_index] if current_step_index < len(optimal_order) else None
    if next_node is None:
        return {
            "message": "The traversal already matches the canonical order.",
            "preview_move": None,
            "remaining_optimal_steps": 0,
        }

    panel_label = "stack" if mode == "dfs" else "queue"
    return {
        "message": f"Visit node {next_node} next to keep the {mode.upper()} {panel_label} order intact.",
        "preview_move": {"type": "graph_visit", "node": next_node},
        "remaining_optimal_steps": max(len(optimal_order) - current_step_index, 0),
    }


def generate_hint(game_type: str, level_config: dict, user_moves: list[dict]) -> dict:
    if game_type == "sorting":
        return _sorting_hint(level_config, user_moves)
    if game_type == "pathfinding":
        return _pathfinding_hint(level_config, user_moves)
    if game_type == "graph_traversal":
        return _graph_hint(level_config, user_moves)
    raise ValueError(f"Unsupported game type: {game_type}")
