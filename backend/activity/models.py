from django.conf import settings
from django.db import models
from common.models import BaseModel
from workspaces.models import Workspace

class ActivityLog(BaseModel):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="activities")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities"
    )
    action = models.CharField(max_length=50) # e.g. "created", "updated", "deleted", "commented"
    target_type = models.CharField(max_length=50) # e.g. "project", "issue", "comment"
    target_name = models.CharField(max_length=200) # e.g. "PROJ-1" or "Acme Website"
    details = models.TextField(blank=True)

    class Meta(BaseModel.Meta):
        ordering = ["-created_at"]

    def __str__(self):
        user_email = self.user.email if self.user else "System"
        return f"{user_email} {self.action} {self.target_type} {self.target_name}"
