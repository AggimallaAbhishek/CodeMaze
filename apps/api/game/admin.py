from django.contrib import admin

from game.models import Level, Submission


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ("title", "game_type", "difficulty", "optimal_steps", "is_active")
    list_filter = ("game_type", "difficulty", "is_active")
    search_fields = ("title",)


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "level", "score", "stars", "is_best", "created_at")
    list_filter = ("level__game_type", "is_best", "stars")
    search_fields = ("user__email", "user__username")
