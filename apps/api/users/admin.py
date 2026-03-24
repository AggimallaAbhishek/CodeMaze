from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from users.models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ("email", "username", "is_staff", "is_verified", "total_xp")
    ordering = ("email",)
    fieldsets = UserAdmin.fieldsets + (
        (
            "Game Profile",
            {
                "fields": (
                    "avatar_url",
                    "total_xp",
                    "oauth_provider",
                    "is_verified",
                    "preferred_algorithms",
                    "join_date",
                )
            },
        ),
    )
