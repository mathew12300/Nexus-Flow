from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Membership, Workspace
from .permissions import IsWorkspaceAdminOrOwner, IsWorkspaceOwner
from .serializers import MembershipInviteSerializer, MembershipSerializer, WorkspaceSerializer

User = get_user_model()


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    /api/workspaces/                — list workspaces the user belongs to / create a new one
    /api/workspaces/{id}/            — retrieve / update / delete (owner only)
    /api/workspaces/{id}/members/    — list members, or POST to invite
    /api/workspaces/{id}/members/{membership_id}/  — PATCH role, DELETE to remove
    """

    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(memberships__user=self.request.user).distinct()

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAuthenticated(), IsWorkspaceOwner()]
        if self.action in ("update", "partial_update"):
            return [IsAuthenticated(), IsWorkspaceAdminOrOwner()]
        return super().get_permissions()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @action(detail=True, methods=["get", "post"])
    def members(self, request, pk=None):
        workspace = self.get_object()

        if request.method == "GET":
            memberships = workspace.memberships.select_related("user").all()
            return Response(MembershipSerializer(memberships, many=True).data)

        # POST — invite an existing user by email. Only admins/owners may invite.
        if not IsWorkspaceAdminOrOwner().has_object_permission(request, self, workspace):
            return Response(
                {"detail": "Only workspace admins or owners can invite members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = MembershipInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]

        invited_user = get_object_or_404(User, email=email)
        membership, created = Membership.objects.get_or_create(
            workspace=workspace,
            user=invited_user,
            defaults={"role": role, "invited_by": request.user},
        )
        if not created:
            return Response({"detail": "User is already a member of this workspace."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path="members/(?P<membership_id>[^/.]+)")
    def member_detail(self, request, pk=None, membership_id=None):
        workspace = self.get_object()

        if not IsWorkspaceAdminOrOwner().has_object_permission(request, self, workspace):
            return Response(
                {"detail": "Only workspace admins or owners can manage members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = get_object_or_404(Membership, id=membership_id, workspace=workspace)

        if membership.role == Membership.Role.OWNER:
            return Response(
                {"detail": "The workspace owner's membership cannot be modified here."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.method == "DELETE":
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH — change role
        new_role = request.data.get("role")
        if new_role not in dict(Membership.Role.choices):
            return Response({"detail": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)
        if new_role == Membership.Role.OWNER:
            return Response(
                {"detail": "Use the ownership-transfer endpoint to grant ownership."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership.role = new_role
        membership.save(update_fields=["role"])
        return Response(MembershipSerializer(membership).data)
