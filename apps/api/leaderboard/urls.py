from django.urls import path

from leaderboard.views import LeaderboardView, LevelLeaderboardView

urlpatterns = [
    path("leaderboard", LeaderboardView.as_view(), name="leaderboard-global"),
    path("leaderboard/levels/<uuid:level_id>", LevelLeaderboardView.as_view(), name="leaderboard-level"),
]
