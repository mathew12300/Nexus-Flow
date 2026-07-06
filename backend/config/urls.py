from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

def api_root(request):
    return JsonResponse({
        "name": "NexusFlow API Service",
        "status": "healthy",
        "version": "1.0"
    })

urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),

    path("api/auth/", include("users.urls")),
    path("api/workspaces/", include("workspaces.urls")),
    path("api/", include("projects.urls")),
    path("api/", include("activity.urls")),
    path("api/", include("insights.urls")),

    # OpenAPI schema + interactive docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
