from algorithm_engine.pathfinding import bfs_shortest_path, dijkstra_shortest_path


def test_bfs_shortest_path_finds_a_path():
    grid = [
        [0, 0, 0],
        [1, 1, 0],
        [0, 0, 0],
    ]
    path = bfs_shortest_path(grid, (0, 0), (2, 2))
    assert path[0] == (0, 0)
    assert path[-1] == (2, 2)


def test_dijkstra_shortest_path_uses_weights():
    grid = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ]
    weights = [
        [1, 100, 1],
        [1, 100, 1],
        [1, 1, 1],
    ]
    path = dijkstra_shortest_path(grid, weights, (0, 0), (0, 2))
    assert path[0] == (0, 0)
    assert path[-1] == (0, 2)
