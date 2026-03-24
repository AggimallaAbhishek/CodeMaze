from __future__ import annotations

from celery import shared_task

from algorithm_engine.validator import validate_submission


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def validate_submission_task(self, game_type: str, user_moves: list[dict], level_config: dict, hints: int, time_elapsed: int):
    return validate_submission(game_type, user_moves, level_config, hints, time_elapsed)
