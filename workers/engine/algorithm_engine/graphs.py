from __future__ import annotations

from collections import deque


def bfs_traversal(adjacency: dict[str, list[str]], start: str) -> list[str]:
    if start not in adjacency:
        return []

    visited = set()
    order = []
    queue = deque([start])

    while queue:
        node = queue.popleft()
        if node in visited:
            continue

        visited.add(node)
        order.append(node)
        for neighbor in adjacency.get(node, []):
            if neighbor not in visited:
                queue.append(neighbor)
    return order


def dfs_traversal(adjacency: dict[str, list[str]], start: str) -> list[str]:
    if start not in adjacency:
        return []

    visited = set()
    order = []

    def walk(node: str) -> None:
        if node in visited:
            return
        visited.add(node)
        order.append(node)
        for neighbor in adjacency.get(node, []):
            walk(neighbor)

    walk(start)
    return order
