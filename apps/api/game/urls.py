from django.urls import path

from game.views import (
    HintView,
    LevelDetailView,
    LevelListView,
    MySubmissionsView,
    StartLevelView,
    SubmissionCreateView,
    SubmissionReplayView,
)

urlpatterns = [
    path("levels", LevelListView.as_view(), name="levels-list"),
    path("levels/<uuid:pk>", LevelDetailView.as_view(), name="levels-detail"),
    path("levels/<uuid:level_id>/start", StartLevelView.as_view(), name="levels-start"),
    path("levels/<uuid:level_id>/hint", HintView.as_view(), name="levels-hint"),
    path("submissions", SubmissionCreateView.as_view(), name="submissions-create"),
    path("submissions/me", MySubmissionsView.as_view(), name="submissions-me"),
    path("submissions/<uuid:pk>/replay", SubmissionReplayView.as_view(), name="submissions-replay"),
]
