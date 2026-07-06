from datetime import date
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from workspaces.models import Workspace, Membership
from projects.models import Project, Issue

User = get_user_model()

class WorkspaceAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        # 1. Verify membership
        workspace = get_object_or_404(Workspace, id=workspace_id)
        if not Membership.objects.filter(workspace=workspace, user=request.user).exists():
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        # Get all issues in workspace
        issues = Issue.objects.filter(workspace=workspace)
        projects = Project.objects.filter(workspace=workspace)

        total_issues = issues.count()
        total_projects = projects.count()

        # Issues by status
        statuses = dict(Issue.Status.choices)
        status_counts = {k: 0 for k in statuses.keys()}
        for k in status_counts.keys():
            status_counts[k] = issues.filter(status=k).count()

        # Issues by priority
        priorities = dict(Issue.Priority.choices)
        priority_counts = {k: 0 for k in priorities.keys()}
        for k in priority_counts.keys():
            priority_counts[k] = issues.filter(priority=k).count()

        # Overdue issues (due_date in past, status not done/canceled)
        today = date.today()
        overdue_issues = issues.exclude(status__in=["done", "canceled"]).filter(due_date__lt=today)
        overdue_count = overdue_issues.count()
        overdue_list = [
            {
                "id": str(issue.id),
                "issue_key": issue.issue_key,
                "title": issue.title,
                "due_date": str(issue.due_date),
                "priority": issue.get_priority_display(),
            }
            for issue in overdue_issues
        ]

        # Completion rate
        done_count = status_counts.get("done", 0)
        completion_rate = round((done_count / total_issues * 100), 1) if total_issues > 0 else 0.0

        # Workload distribution
        workloads = []
        members = workspace.members.all()
        for member in members:
            count = issues.filter(assignee=member).exclude(status__in=["done", "canceled"]).count()
            workloads.append({
                "id": str(member.id),
                "email": member.email,
                "display_name": member.display_name,
                "issue_count": count
            })
        # Unassigned issues
        unassigned_count = issues.filter(assignee__isnull=True).exclude(status__in=["done", "canceled"]).count()
        workloads.append({
            "id": None,
            "email": "unassigned@nexusflow.dev",
            "display_name": "Unassigned",
            "issue_count": unassigned_count
        })

        return Response({
            "total_projects": total_projects,
            "total_issues": total_issues,
            "status_counts": status_counts,
            "priority_counts": priority_counts,
            "overdue_count": overdue_count,
            "overdue_issues": overdue_list,
            "completion_rate": completion_rate,
            "workloads": workloads
        })


class WorkspaceAIInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)
        if not Membership.objects.filter(workspace=workspace, user=request.user).exists():
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        issues = Issue.objects.filter(workspace=workspace)
        active_issues = issues.exclude(status__in=["done", "canceled"])
        today = date.today()

        # R&D rule engine to generate high-quality SaaS insights
        bottlenecks = []
        warnings = []
        recommendations = []

        # 1. Check overload (more than 3 active issues)
        overloaded_members = []
        members = workspace.members.all()
        for member in members:
            count = active_issues.filter(assignee=member).count()
            if count > 3:
                overloaded_members.append(member)
                warnings.append(
                    f"Resource Alert: **{member.display_name}** has {count} active tasks assigned. "
                    "Consider redistributing workload to prevent developer burnout."
                )

        # 2. Check overdue critical/urgent issues
        overdue_critical = active_issues.filter(due_date__lt=today, priority__in=["high", "urgent"])
        if overdue_critical.exists():
            keys = ", ".join([issue.issue_key for issue in overdue_critical])
            bottlenecks.append(
                f"SLA Breach Risk: Critical tasks **{keys}** are past due dates. "
                "Immediate developer intervention is advised."
            )

        # 3. Check backlog pile up
        backlog_count = active_issues.filter(status="backlog").count()
        if backlog_count > 5:
            recommendations.append(
                f"Backlog Growth: There are {backlog_count} items lingering in the Backlog. "
                "Schedule a refinement session to prune outdated stories."
            )

        # 4. Success metrics & general insights
        done_count = issues.filter(status="done").count()
        total_count = issues.count()
        rate = round((done_count / total_count * 100), 1) if total_count > 0 else 0.0

        if rate > 75:
            recommendations.append(
                "Velocity Status: Team efficiency is excellent. Your sprint completion rate is above 75%."
            )
        elif rate > 0:
            recommendations.append(
                "Sprint Alignment: Focus on moving tasks in 'In Progress' to 'Done' before pulling in new backlog items."
            )

        # Standard recommendations if nothing stands out
        if not warnings:
            recommendations.append("Workload Balance: Core tasks are evenly distributed among workspace members.")
        if not bottlenecks:
            recommendations.append("Timeline Status: No immediate delivery blocks or overdue critical tasks detected.")

        return Response({
            "warnings": warnings,
            "bottlenecks": bottlenecks,
            "recommendations": recommendations,
            "summary": f"AI analysis completed for {workspace.name}. Your velocity is currently at {rate}% with {active_issues.count()} unresolved issue(s)."
        })
