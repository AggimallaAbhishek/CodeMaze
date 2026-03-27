from django.contrib import admin
from django.urls import include, path

from common.views import HealthCheckView, ReadinessView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("users.urls")),
    path("api/v1/", include("game.urls")),
    path("api/v1/", include("leaderboard.urls")),
    path("api/v1/healthz", HealthCheckView.as_view(), name="healthz"),
    path("api/v1/readyz", ReadinessView.as_view(), name="readyz"),
]
