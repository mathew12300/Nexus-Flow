from django.urls import path
from .views import WorkspaceAnalyticsView, WorkspaceAIInsightsView

urlpatterns = [
    path("workspaces/<uuid:workspace_id>/analytics/", WorkspaceAnalyticsView.as_view(), name="workspace-analytics"),
    path("workspaces/<uuid:workspace_id>/ai-insights/", WorkspaceAIInsightsView.as_view(), name="workspace-ai-insights"),
]
