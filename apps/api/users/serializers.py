from __future__ import annotations

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from leaderboard.progression import get_user_progress_overview, serialize_badges
from users.models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "username", "password"]

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
        )


class UserMeSerializer(serializers.ModelSerializer):
    progression = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "avatar_url",
            "total_xp",
            "is_verified",
            "preferred_algorithms",
            "join_date",
            "progression",
            "badges",
            "stats",
        ]
        read_only_fields = ["id", "email", "total_xp", "is_verified", "join_date"]

    def get_progression(self, obj):
        overview = get_user_progress_overview(obj)
        return {
            "level": overview["level"],
            "xp_total": overview["xp_total"],
            "xp_into_level": overview["xp_into_level"],
            "xp_for_next_level": overview["xp_for_next_level"],
            "xp_to_next_level": overview["xp_to_next_level"],
            "progress_ratio": overview["progress_ratio"],
        }

    def get_badges(self, obj):
        badges = obj.badges.order_by("-earned_at")
        return serialize_badges(badges)

    def get_stats(self, obj):
        overview = get_user_progress_overview(obj)
        return overview["stats"]


class PublicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "avatar_url", "total_xp", "join_date"]


class EmailVerificationConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=1024)


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(max_length=4096)
