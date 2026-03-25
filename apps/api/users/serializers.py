from __future__ import annotations

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

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
        ]
        read_only_fields = ["id", "email", "total_xp", "is_verified", "join_date"]


class PublicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "avatar_url", "total_xp", "join_date"]


class EmailVerificationConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=1024)


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(max_length=4096)
