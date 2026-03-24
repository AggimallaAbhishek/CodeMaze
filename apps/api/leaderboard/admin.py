from django.contrib import admin

from leaderboard.models import LeaderboardEntry, UserBadge


@admin.register(LeaderboardEntry)
class LeaderboardEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "level", "scope", "score", "rank", "created_at")
    list_filter = ("scope",)


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ("user", "badge_code", "earned_at")
    search_fields = ("user__email", "badge_code")
