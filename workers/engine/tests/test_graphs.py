from algorithm_engine.graphs import bfs_traversal, dfs_traversal


def test_bfs_traversal_order():
    adjacency = {
        "A": ["B", "C"],
        "B": ["D"],
        "C": [],
        "D": [],
    }
    assert bfs_traversal(adjacency, "A") == ["A", "B", "C", "D"]


def test_dfs_traversal_order():
    adjacency = {
        "A": ["B", "C"],
        "B": ["D"],
        "C": [],
        "D": [],
    }
    assert dfs_traversal(adjacency, "A") == ["A", "B", "D", "C"]
