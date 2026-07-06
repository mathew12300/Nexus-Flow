from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, Issue, Comment

User = get_user_model()

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "display_name"]


class ProjectSerializer(serializers.ModelSerializer):
    creator = UserMiniSerializer(read_only=True)
    issue_count = serializers.IntegerField(source="issues.count", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "workspace", "name", "key", "description", "status", "creator", "issue_count", "created_at", "updated_at"]
        read_only_fields = ["id", "creator", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["creator"] = self.context["request"].user
        return super().create(validated_data)


class IssueSerializer(serializers.ModelSerializer):
    creator = UserMiniSerializer(read_only=True)
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    assignee_details = UserMiniSerializer(source="assignee", read_only=True)
    project_key = serializers.CharField(source="project.key", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    issue_key = serializers.CharField(read_only=True)

    class Meta:
        model = Issue
        fields = [
            "id",
            "workspace",
            "project",
            "project_key",
            "project_name",
            "sequence_number",
            "issue_key",
            "title",
            "description",
            "status",
            "priority",
            "creator",
            "assignee",
            "assignee_details",
            "due_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "sequence_number", "issue_key", "creator", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["creator"] = self.context["request"].user
        return super().create(validated_data)


class CommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "issue", "author", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)
