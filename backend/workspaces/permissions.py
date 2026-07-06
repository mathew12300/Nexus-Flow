from rest_framework import permissions

from .models import Membership


class IsWorkspaceMember(permissions.BasePermission):
    """Allows access only to users who belong to the workspace being accessed."""

    def has_object_permission(self, request, view, obj):
        workspace = obj if hasattr(obj, "memberships") else obj.workspace
        return Membership.objects.filter(workspace=workspace, user=request.user).exists()


class IsWorkspaceAdminOrOwner(permissions.BasePermission):
    """Allows write access only to workspace Owners/Admins; read access to any member."""

    def has_object_permission(self, request, view, obj):
        workspace = obj if hasattr(obj, "memberships") else obj.workspace
        membership = Membership.objects.filter(workspace=workspace, user=request.user).first()
        if membership is None:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return membership.can_manage_members


class IsWorkspaceOwner(permissions.BasePermission):
    """Reserved for irreversible actions: deleting a workspace, transferring ownership."""

    def has_object_permission(self, request, view, obj):
        workspace = obj if hasattr(obj, "memberships") else obj.workspace
        return workspace.owner_id == request.user.id
