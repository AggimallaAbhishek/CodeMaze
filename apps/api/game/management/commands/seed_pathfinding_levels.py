from __future__ import annotations

from django.core.management.base import BaseCommand

from algorithm_engine.pathfinding import bfs_shortest_path, dijkstra_shortest_path
from game.models import Level


class Command(BaseCommand):
    help = "Seed default pathfinding levels for local development."

    LEVELS = [
        {
            "title": "Maze Corridor",
            "difficulty": 1,
            "grid": [
                [0, 0, 1, 0, 0, 0],
                [1, 0, 1, 0, 1, 0],
                [0, 0, 0, 0, 1, 0],
                [0, 1, 1, 0, 0, 0],
                [0, 0, 0, 1, 1, 0],
            ],
            "start": [0, 0],
            "end": [4, 5],
            "weighted": False,
            "mode": "bfs",
        },
        {
            "title": "Maze Forked Route",
            "difficulty": 2,
            "grid": [
                [0, 0, 0, 0, 0],
                [0, 1, 1, 1, 0],
                [0, 0, 0, 1, 0],
                [1, 1, 0, 1, 0],
                [0, 0, 0, 0, 0],
            ],
            "start": [0, 0],
            "end": [4, 4],
            "weighted": False,
            "mode": "bfs",
        },
        {
            "title": "Weighted Crossroads",
            "difficulty": 3,
            "grid": [
                [0, 0, 0, 0, 0],
                [0, 1, 1, 1, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
            ],
            "weights": [
                [1, 9, 9, 9, 1],
                [1, 1, 1, 1, 1],
                [1, 1, 1, 9, 1],
                [9, 9, 1, 1, 1],
            ],
            "start": [0, 0],
            "end": [0, 4],
            "weighted": True,
            "mode": "dijkstra",
        },
    ]

    def handle(self, *args, **options):
        seeded = 0
        for index, item in enumerate(self.LEVELS, start=1):
            start = tuple(item["start"])
            end = tuple(item["end"])
            grid = item["grid"]
            weighted = item.get("weighted", False)

            if weighted:
                weights = item.get("weights", [[1 for _ in row] for row in grid])
                optimal_path = dijkstra_shortest_path(grid, weights, start, end)
            else:
                optimal_path = bfs_shortest_path(grid, start, end)

            config = {
                "grid": grid,
                "start": item["start"],
                "end": item["end"],
                "weighted": weighted,
                "mode": item.get("mode", "bfs"),
            }
            if weighted:
                config["weights"] = item.get("weights")

            _, created = Level.objects.update_or_create(
                title=item["title"],
                defaults={
                    "game_type": Level.GameType.PATHFINDING,
                    "difficulty": item["difficulty"],
                    "config": config,
                    "optimal_steps": len(optimal_path),
                    "is_active": True,
                    "order_index": index,
                },
            )
            if created:
                seeded += 1

        self.stdout.write(self.style.SUCCESS(f"Pathfinding levels seeded. new={seeded} total={len(self.LEVELS)}"))
