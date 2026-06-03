from __future__ import annotations

from django.core.management.base import BaseCommand

from algorithm_engine.dynamic_programming import solve_dp
from game.models import Level


class Command(BaseCommand):
    help = "Seed default dynamic programming levels for local development."

    LEVELS = [
        {
            "title": "DP Fibonacci Basics",
            "difficulty": 1,
            "config": {
                "problem_type": "fibonacci",
                "n": 8,
            },
        },
        {
            "title": "DP Coin Change",
            "difficulty": 2,
            "config": {
                "problem_type": "coin_change",
                "coins": [1, 3, 4],
                "target": 7,
            },
        },
        {
            "title": "DP Grid Traveler",
            "difficulty": 2,
            "config": {
                "problem_type": "grid_traveler",
                "rows": 4,
                "cols": 4,
            },
        },
        {
            "title": "DP 0/1 Knapsack",
            "difficulty": 3,
            "config": {
                "problem_type": "knapsack",
                "weights": [2, 3, 4, 5],
                "values": [3, 4, 5, 6],
                "capacity": 8,
            },
        },
        {
            "title": "DP Fibonacci Extended",
            "difficulty": 3,
            "config": {
                "problem_type": "fibonacci",
                "n": 15,
            },
        },
        {
            "title": "DP Coin Change Advanced",
            "difficulty": 4,
            "config": {
                "problem_type": "coin_change",
                "coins": [1, 5, 10, 25],
                "target": 12,
            },
        },
    ]

    def handle(self, *args, **options):
        seeded = 0
        for index, item in enumerate(self.LEVELS, start=1):
            config = item["config"]
            solution = solve_dp(config)
            optimal_steps = len(solution["steps"])

            _, created = Level.objects.update_or_create(
                title=item["title"],
                defaults={
                    "game_type": Level.GameType.DYNAMIC_PROGRAMMING,
                    "difficulty": item["difficulty"],
                    "config": config,
                    "optimal_steps": optimal_steps,
                    "is_active": True,
                    "order_index": index,
                },
            )
            if created:
                seeded += 1

        self.stdout.write(
            self.style.SUCCESS(f"DP levels seeded. new={seeded} total={len(self.LEVELS)}")
        )
