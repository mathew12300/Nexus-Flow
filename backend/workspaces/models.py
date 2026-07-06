from django.conf import settings
from django.db import models
from django.utils.text import slugify

from common.models import BaseModel


class Workspace(BaseModel):
    """
    A Workspace is the top-level container for a team's work — analogous to
    an "organization" or "space" in tools like Linear/Notion. Every project,
    task, and piece of activity in NexusFlow belongs to exactly one workspace,
    and access to that data is gated entirely through Membership below.
    """

    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_workspaces",
    )
    is_active = models.BooleanField(default=True)

    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="Membership",
        through_fields=("workspace", "user"),
        related_name="workspaces",
    )

    class Meta(BaseModel.Meta):
        pass

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)[:150]
            slug = base_slug
            counter = 1
            while Workspace.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                counter += 1
                slug = f"{base_slug}-{counter}"
            self.slug = slug
        super().save(*args, **kwargs)


class Membership(BaseModel):
    """
    Join table between User and Workspace that also carries the user's role
    within that specific workspace. Roles are workspace-scoped, not global —
    the same person can be an Owner of one workspace and a Viewer of another.
    """

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"
        VIEWER = "viewer", "Viewer"

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_invitations",
    )

    class Meta(BaseModel.Meta):
        constraints = [
            models.UniqueConstraint(fields=["workspace", "user"], name="unique_workspace_membership"),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.workspace.name} ({self.role})"

    @property
    def can_manage_members(self):
        return self.role in (self.Role.OWNER, self.Role.ADMIN)

    @property
    def can_edit_content(self):
        return self.role in (self.Role.OWNER, self.Role.ADMIN, self.Role.MEMBER)
