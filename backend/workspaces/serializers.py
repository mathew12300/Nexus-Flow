from django.db import transaction
from rest_framework import serializers

from users.serializers import UserSerializer

from .models import Membership, Workspace


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "role", "created_at"]
        read_only_fields = ["id", "created_at"]


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id", "name", "slug", "description", "owner",
            "is_active", "member_count", "my_role", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "owner", "created_at", "updated_at"]

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        workspace = Workspace.objects.create(owner=request.user, **validated_data)
        Membership.objects.create(workspace=workspace, user=request.user, role=Membership.Role.OWNER)
        return workspace


class MembershipInviteSerializer(serializers.Serializer):
    """Invite an existing user to a workspace by email."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Membership.Role.choices, default=Membership.Role.MEMBER)

    def validate_role(self, value):
        if value == Membership.Role.OWNER:
            raise serializers.ValidationError(
                "Ownership is transferred separately and cannot be granted via invite."
            )
        return value
