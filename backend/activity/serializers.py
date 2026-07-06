from rest_framework import serializers
from projects.serializers import UserMiniSerializer
from .models import ActivityLog

class ActivityLogSerializer(serializers.ModelSerializer):
    user_details = UserMiniSerializer(source="user", read_only=True)

    class Meta:
        model = ActivityLog
        fields = ["id", "workspace", "user", "user_details", "action", "target_type", "target_name", "details", "created_at"]
