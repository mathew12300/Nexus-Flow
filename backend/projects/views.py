from rest_framework import viewsets, permissions, serializers
from rest_framework.permissions import IsAuthenticated
from workspaces.models import Membership
from activity.utils import log_activity
from .models import Project, Issue, Comment
from .serializers import ProjectSerializer, IssueSerializer, CommentSerializer

class IsWorkspaceEditorOrReadOnly(permissions.BasePermission):
    """
    Checks if user is member of the workspace and can edit content (not viewer).
    Safe methods are allowed to any workspace member.
    """
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Project) or isinstance(obj, Issue):
            workspace = obj.workspace
        elif isinstance(obj, Comment):
            workspace = obj.issue.workspace
        else:
            return False

        membership = Membership.objects.filter(workspace=workspace, user=request.user).first()
        if not membership:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return membership.can_edit_content


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceEditorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Project.objects.filter(workspace__memberships__user=user).distinct()
        workspace_id = self.request.query_params.get("workspace")
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        return qs

    def perform_create(self, serializer):
        workspace = serializer.validated_data["workspace"]
        if not Membership.objects.filter(workspace=workspace, user=self.request.user).exists():
            raise serializers.ValidationError("You must be a member of the workspace to create projects.")
        project = serializer.save()
        log_activity(workspace, self.request.user, "created project", "project", project.name)

    def perform_update(self, serializer):
        project = serializer.save()
        log_activity(project.workspace, self.request.user, "updated project", "project", project.name)

    def perform_destroy(self, instance):
        workspace = instance.workspace
        name = instance.name
        instance.delete()
        log_activity(workspace, self.request.user, "deleted project", "project", name)


class IssueViewSet(viewsets.ModelViewSet):
    serializer_class = IssueSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceEditorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Issue.objects.filter(workspace__memberships__user=user).distinct()
        workspace_id = self.request.query_params.get("workspace")
        project_id = self.request.query_params.get("project")
        status = self.request.query_params.get("status")

        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        if project_id:
            qs = qs.filter(project_id=project_id)
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        workspace = serializer.validated_data["workspace"]
        if not Membership.objects.filter(workspace=workspace, user=self.request.user).exists():
            raise serializers.ValidationError("You must be a member of the workspace to create issues.")
        issue = serializer.save()
        log_activity(
            workspace,
            self.request.user,
            "created issue",
            "issue",
            issue.issue_key,
            f"Title: {issue.title}"
        )

    def perform_update(self, serializer):
        issue = serializer.save()
        assignee_email = issue.assignee.email if issue.assignee else "None"
        log_activity(
            issue.workspace,
            self.request.user,
            "updated issue",
            "issue",
            issue.issue_key,
            f"Status: {issue.get_status_display()}, Priority: {issue.get_priority_display()}, Assignee: {assignee_email}"
        )

    def perform_destroy(self, instance):
        workspace = instance.workspace
        issue_key = instance.issue_key
        instance.delete()
        log_activity(workspace, self.request.user, "deleted issue", "issue", issue_key)


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceEditorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Comment.objects.filter(issue__workspace__memberships__user=user).distinct()
        issue_id = self.request.query_params.get("issue")
        if issue_id:
            qs = qs.filter(issue_id=issue_id)
        return qs

    def perform_create(self, serializer):
        issue = serializer.validated_data["issue"]
        if not Membership.objects.filter(workspace=issue.workspace, user=self.request.user).exists():
            raise serializers.ValidationError("You must be a member of the workspace to comment.")
        comment = serializer.save()
        log_activity(
            issue.workspace,
            self.request.user,
            "commented on",
            "issue",
            issue.issue_key,
            comment.content[:100]
        )

    def perform_destroy(self, instance):
        workspace = instance.issue.workspace
        issue_key = instance.issue.issue_key
        instance.delete()
        log_activity(workspace, self.request.user, "deleted comment on", "issue", issue_key)
