from __future__ import annotations

from django.core.management.base import BaseCommand

from algorithm_engine.sorting import bubble_sort, quick_sort, selection_sort
from game.models import Level


class Command(BaseCommand):
    help = "Seed default sorting levels for local development."

    LEVELS = [
        {"title": "Bubble Basics 1", "difficulty": 1, "algorithm": "bubble", "array": [3, 1, 2, 4]},
        {"title": "Bubble Basics 2", "difficulty": 1, "algorithm": "bubble", "array": [4, 3, 2, 1]},
        {"title": "Selection Start 1", "difficulty": 2, "algorithm": "selection", "array": [5, 1, 4, 2, 3]},
        {"title": "Selection Start 2", "difficulty": 2, "algorithm": "selection", "array": [8, 2, 7, 1, 5]},
        {"title": "Selection Intermediate", "difficulty": 3, "algorithm": "selection", "array": [9, 6, 1, 8, 2, 7]},
        {"title": "Quick Pivot 1", "difficulty": 3, "algorithm": "quick", "array": [10, 3, 8, 4, 2, 6]},
        {"title": "Quick Pivot 2", "difficulty": 4, "algorithm": "quick", "array": [11, 7, 3, 9, 1, 5]},
        {"title": "Mixed Challenge 1", "difficulty": 4, "algorithm": "bubble", "array": [12, 4, 11, 2, 8, 1]},
        {"title": "Mixed Challenge 2", "difficulty": 5, "algorithm": "selection", "array": [13, 9, 6, 2, 10, 1, 8]},
        {"title": "Expert Quick", "difficulty": 5, "algorithm": "quick", "array": [14, 12, 5, 11, 3, 9, 2]},
    ]

    def handle(self, *args, **options):
        seeded = 0
        for index, item in enumerate(self.LEVELS, start=1):
            if item["algorithm"] == "bubble":
                solver = bubble_sort(item["array"])
            elif item["algorithm"] == "quick":
                solver = quick_sort(item["array"])
            else:
                solver = selection_sort(item["array"])

            _, created = Level.objects.update_or_create(
                title=item["title"],
                defaults={
                    "game_type": Level.GameType.SORTING,
                    "difficulty": item["difficulty"],
                    "config": {
                        "algorithm": item["algorithm"],
                        "array": item["array"],
                    },
                    "optimal_steps": len(solver["steps"]),
                    "is_active": True,
                    "order_index": index,
                },
            )
            if created:
                seeded += 1

        self.stdout.write(self.style.SUCCESS(f"Sorting levels seeded. new={seeded} total={len(self.LEVELS)}"))
