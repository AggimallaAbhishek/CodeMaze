from algorithm_engine.hints import generate_hint


def test_generate_sorting_hint_returns_next_swap():
    hint = generate_hint(
        "sorting",
        {"algorithm": "selection", "array": [3, 1, 2]},
        [],
    )

    assert hint["preview_move"] == {"type": "swap", "indices": [0, 1]}
    assert hint["remaining_optimal_steps"] == 2


def test_generate_pathfinding_hint_returns_next_cell():
    hint = generate_hint(
        "pathfinding",
        {
            "grid": [[0, 0, 0], [1, 1, 0], [0, 0, 0]],
            "start": [0, 0],
            "end": [2, 2],
            "weighted": False,
        },
        [{"type": "path_cell", "cell": [0, 0]}],
    )

    assert hint["preview_move"] == {"type": "path_cell", "cell": [0, 1]}
    assert hint["remaining_optimal_steps"] == 4


def test_generate_graph_hint_returns_next_node():
    hint = generate_hint(
        "graph_traversal",
        {
            "adjacency": {"A": ["B", "C"], "B": [], "C": []},
            "start": "A",
            "mode": "bfs",
        },
        [{"type": "graph_visit", "node": "A"}],
    )

    assert hint["preview_move"] == {"type": "graph_visit", "node": "B"}
    assert hint["remaining_optimal_steps"] == 2
