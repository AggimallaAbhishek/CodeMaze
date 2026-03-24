from __future__ import annotations

import heapq
from collections import deque

Coordinate = tuple[int, int]


def _neighbors(grid: list[list[int]], row: int, col: int):
    for delta_row, delta_col in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        next_row, next_col = row + delta_row, col + delta_col
        if 0 <= next_row < len(grid) and 0 <= next_col < len(grid[0]):
            if grid[next_row][next_col] != 1:
                yield (next_row, next_col)


def bfs_shortest_path(grid: list[list[int]], start: Coordinate, end: Coordinate) -> list[Coordinate]:
    queue = deque([(start, [start])])
    visited = {start}

    while queue:
        current, path = queue.popleft()
        if current == end:
            return path

        row, col = current
        for neighbor in _neighbors(grid, row, col):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))

    return []


def dijkstra_shortest_path(
    grid: list[list[int]],
    weights: list[list[int]],
    start: Coordinate,
    end: Coordinate,
) -> list[Coordinate]:
    heap: list[tuple[int, Coordinate, list[Coordinate]]] = [(0, start, [start])]
    distances = {start: 0}

    while heap:
        current_cost, current, path = heapq.heappop(heap)
        if current == end:
            return path

        row, col = current
        for neighbor in _neighbors(grid, row, col):
            nr, nc = neighbor
            next_cost = current_cost + weights[nr][nc]
            if next_cost < distances.get(neighbor, float("inf")):
                distances[neighbor] = next_cost
                heapq.heappush(heap, (next_cost, neighbor, path + [neighbor]))

    return []
