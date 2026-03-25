from __future__ import annotations

from django.core.management.base import BaseCommand

from algorithm_engine.graphs import bfs_traversal, dfs_traversal
from game.models import Level


class Command(BaseCommand):
    help = "Seed default graph traversal levels for local development."

    LEVELS = [
        {
            "title": "Graph BFS Basics",
            "difficulty": 1,
            "mode": "bfs",
            "start": "A",
            "adjacency": {
                "A": ["B", "C"],
                "B": ["D", "E"],
                "C": ["F"],
                "D": [],
                "E": [],
                "F": [],
            },
            "positions": {
                "A": [50, 12],
                "B": [20, 34],
                "C": [80, 34],
                "D": [8, 66],
                "E": [36, 66],
                "F": [72, 66],
            },
        },
        {
            "title": "Graph DFS Branches",
            "difficulty": 2,
            "mode": "dfs",
            "start": "S",
            "adjacency": {
                "S": ["A", "B"],
                "A": ["C", "D"],
                "B": ["E"],
                "C": [],
                "D": ["F"],
                "E": [],
                "F": [],
            },
            "positions": {
                "S": [50, 10],
                "A": [28, 28],
                "B": [72, 28],
                "C": [16, 52],
                "D": [40, 52],
                "E": [72, 52],
                "F": [40, 76],
            },
        },
        {
            "title": "Graph BFS Wide Layer",
            "difficulty": 3,
            "mode": "bfs",
            "start": "R",
            "adjacency": {
                "R": ["A", "B", "C"],
                "A": ["D"],
                "B": ["E"],
                "C": ["F", "G"],
                "D": [],
                "E": [],
                "F": [],
                "G": [],
            },
            "positions": {
                "R": [50, 10],
                "A": [20, 30],
                "B": [50, 30],
                "C": [80, 30],
                "D": [14, 58],
                "E": [38, 58],
                "F": [64, 58],
                "G": [86, 58],
            },
        },
    ]

    def handle(self, *args, **options):
        seeded = 0
        for index, item in enumerate(self.LEVELS, start=1):
            adjacency = item["adjacency"]
            start = item["start"]
            mode = item.get("mode", "bfs")

            if mode == "dfs":
                optimal_order = dfs_traversal(adjacency, start)
            else:
                optimal_order = bfs_traversal(adjacency, start)

            _, created = Level.objects.update_or_create(
                title=item["title"],
                defaults={
                    "game_type": Level.GameType.GRAPH_TRAVERSAL,
                    "difficulty": item["difficulty"],
                    "config": {
                        "adjacency": adjacency,
                        "start": start,
                        "mode": mode,
                        "positions": item.get("positions", {}),
                    },
                    "optimal_steps": len(optimal_order),
                    "is_active": True,
                    "order_index": index,
                },
            )
            if created:
                seeded += 1

        self.stdout.write(self.style.SUCCESS(f"Graph levels seeded. new={seeded} total={len(self.LEVELS)}"))
