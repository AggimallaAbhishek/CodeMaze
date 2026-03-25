from django.urls import path

from users.views import (
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    GoogleAuthView,
    LoginView,
    LogoutView,
    MeView,
    PublicProfileView,
    RefreshView,
    RegisterView,
)

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/verify-email/request", EmailVerificationRequestView.as_view(), name="auth-verify-email-request"),
    path("auth/verify-email/confirm", EmailVerificationConfirmView.as_view(), name="auth-verify-email-confirm"),
    path("auth/google", GoogleAuthView.as_view(), name="auth-google"),
    path("users/me", MeView.as_view(), name="users-me"),
    path("users/<str:username>", PublicProfileView.as_view(), name="users-public-profile"),
]
