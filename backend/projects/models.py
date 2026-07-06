from django.conf import settings
from django.db import models
from common.models import BaseModel
from workspaces.models import Workspace

class Project(BaseModel):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=10) # e.g., "PROJ"
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("archived", "Archived")],
        default="active"
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_projects"
    )

    class Meta(BaseModel.Meta):
        unique_together = (("workspace", "key"), ("workspace", "name"))

    def __str__(self):
        return f"{self.name} ({self.key})"


class Issue(BaseModel):
    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        TODO = "todo", "Todo"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"
        CANCELED = "canceled", "Canceled"

    class Priority(models.TextChoices):
        NONE = "none", "None"
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="issues")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="issues")
    sequence_number = models.IntegerField(blank=True, null=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NONE)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_issues"
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_issues"
    )
    due_date = models.DateField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        unique_together = (("project", "sequence_number"),)

    def __str__(self):
        return f"{self.issue_key}: {self.title}"

    @property
    def issue_key(self):
        return f"{self.project.key}-{self.sequence_number}"

    def save(self, *args, **kwargs):
        if not self.sequence_number:
            latest = Issue.objects.filter(project=self.project).order_by("-sequence_number").first()
            self.sequence_number = (latest.sequence_number + 1) if latest else 1
        super().save(*args, **kwargs)


class Comment(BaseModel):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="issue_comments"
    )
    content = models.TextField()

    class Meta(BaseModel.Meta):
        pass

    def __str__(self):
        return f"Comment by {self.author.email} on {self.issue.id}"
