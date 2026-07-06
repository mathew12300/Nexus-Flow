from .models import ActivityLog

def log_activity(workspace, user, action, target_type, target_name, details=""):
    try:
        return ActivityLog.objects.create(
            workspace=workspace,
            user=user,
            action=action,
            target_type=target_type,
            target_name=target_name,
            details=details
        )
    except Exception:
        pass
