from __future__ import annotations

from collections.abc import Iterable

from django.db.models import Count, Max, Q

from leaderboard.models import UserBadge

BADGE_DEFINITIONS = {
    "first_clear": {
        "title": "First Clear",
        "description": "Finish any puzzle with a non-zero score.",
    },
    "triple_star": {
        "title": "Triple Star",
        "description": "Earn 3 stars on any puzzle.",
    },
    "centurion": {
        "title": "Centurion",
        "description": "Score a perfect 100 on a puzzle.",
    },
    "sorting_scholar": {
        "title": "Sorting Scholar",
        "description": "Earn 3 stars on a sorting puzzle.",
    },
    "maze_mapper": {
        "title": "Maze Mapper",
        "description": "Earn 3 stars on a pathfinding puzzle.",
    },
    "graph_guru": {
        "title": "Graph Guru",
        "description": "Earn 3 stars on a graph traversal puzzle.",
    },
    "xp_250": {
        "title": "XP 250",
        "description": "Reach 250 total XP.",
    },
    "xp_1000": {
        "title": "XP 1000",
        "description": "Reach 1000 total XP.",
    },
}


def xp_required_for_next_level(level: int) -> int:
    safe_level = max(level, 1)
    return 100 + ((safe_level - 1) * 50)


def build_progression_snapshot(total_xp: int) -> dict:
    level = 1
    xp_remaining = max(total_xp, 0)
    current_requirement = xp_required_for_next_level(level)

    while xp_remaining >= current_requirement:
        xp_remaining -= current_requirement
        level += 1
        current_requirement = xp_required_for_next_level(level)

    return {
        "level": level,
        "xp_total": max(total_xp, 0),
        "xp_into_level": xp_remaining,
        "xp_for_next_level": current_requirement,
        "xp_to_next_level": current_requirement - xp_remaining,
        "progress_ratio": round(xp_remaining / current_requirement, 4) if current_requirement else 1.0,
    }


def _badge_payload(badge: UserBadge) -> dict:
    definition = BADGE_DEFINITIONS.get(badge.badge_code, {})
    return {
        "code": badge.badge_code,
        "title": definition.get("title", badge.badge_code.replace("_", " ").title()),
        "description": definition.get("description", ""),
        "earned_at": badge.earned_at,
    }


def serialize_badges(badges: Iterable[UserBadge]) -> list[dict]:
    return [_badge_payload(badge) for badge in badges]


def get_user_progress_overview(user) -> dict:
    from game.models import Submission

    stats = Submission.objects.filter(user=user).aggregate(
        submissions_count=Count("id"),
        solved_count=Count("id", filter=Q(score__gt=0)),
        best_score=Max("score"),
        personal_best_count=Count("id", filter=Q(is_best=True)),
    )
    progression = build_progression_snapshot(user.total_xp)
    return {
        **progression,
        "stats": {
            "submissions_count": stats["submissions_count"] or 0,
            "solved_count": stats["solved_count"] or 0,
            "best_score": stats["best_score"] or 0,
            "personal_best_count": stats["personal_best_count"] or 0,
        },
    }


def award_badges_for_submission(user, level, submission) -> list[dict]:
    requested_codes: list[str] = []

    if submission.score > 0:
        requested_codes.append("first_clear")
    if submission.stars == 3:
        requested_codes.append("triple_star")
    if submission.score == 100:
        requested_codes.append("centurion")

    mode_badges = {
        "sorting": "sorting_scholar",
        "pathfinding": "maze_mapper",
        "graph_traversal": "graph_guru",
    }
    mode_badge = mode_badges.get(level.game_type)
    if submission.stars == 3 and mode_badge:
        requested_codes.append(mode_badge)

    if user.total_xp >= 250:
        requested_codes.append("xp_250")
    if user.total_xp >= 1000:
        requested_codes.append("xp_1000")

    existing_codes = set(user.badges.filter(badge_code__in=requested_codes).values_list("badge_code", flat=True))
    badges_to_create = [code for code in requested_codes if code not in existing_codes]

    created_badges: list[UserBadge] = []
    for code in badges_to_create:
        badge = UserBadge.objects.create(user=user, badge_code=code)
        created_badges.append(badge)

    return serialize_badges(created_badges)
