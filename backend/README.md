# NexusFlow — Backend (Django REST Framework)

Intelligent Work Execution Platform. This is the API service: auth, workspaces,
role-based access control, and (in later milestones) projects, tasks, activity,
notifications, and AI-assisted insights.

This first milestone implements the **foundation** every other module builds on:
JWT authentication and multi-tenant workspaces with roles.

## Stack

- Python 3.12, Django 6, Django REST Framework
- PostgreSQL 16
- SimpleJWT for authentication
- drf-spectacular for OpenAPI docs

## Architecture decisions

- **Email-based auth.** Custom `User` model (`users.User`) with `email` as the
  username field — no separate username, matching how B2B SaaS products
  actually onboard people.
- **UUID primary keys everywhere** (via `common.BaseModel`), so IDs are never
  guessable/sequential and are safe to expose in URLs — important once
  workspace data (projects, tasks) is added, since workspace IDs will show up
  in shareable links.
- **Workspace-scoped RBAC, not global roles.** `Membership` is the join table
  between `User` and `Workspace` and carries the role (`owner`, `admin`,
  `member`, `viewer`) for *that* workspace. The same user can be an owner of
  one workspace and a viewer of another — this mirrors how Slack/Linear/Notion
  actually structure permissions, and it's the pattern every future module
  (projects, tasks, comments) will check against via
  `workspaces.permissions.IsWorkspaceAdminOrOwner` / `IsWorkspaceMember`.
- **All workspace data queries are filtered through membership.** `Workspace.objects`
  is never queried directly in views — `WorkspaceViewSet.get_queryset()` always
  filters to `memberships__user=request.user`, so there's no path to leak another
  team's data by forgetting a permission check on one endpoint.
- **JWT over session auth**, since the frontend is a separate SPA (React) that
  will eventually be served from its own origin/CDN, not from Django templates.

## Project layout

```
config/          # settings, root urls, wsgi/asgi
common/          # shared abstract base model (UUID pk + timestamps)
users/           # custom User model, auth endpoints (register/login/me)
workspaces/      # Workspace + Membership models, RBAC, invite/manage members
```

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # then fill in DB credentials / secret key

# Requires a running PostgreSQL instance matching the .env settings:
#   createuser nexusflow_user -P
#   createdb nexusflow_db -O nexusflow_user

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API docs (Swagger UI) once running: `http://localhost:8000/api/docs/`
Django admin: `http://localhost:8000/admin/`

## API reference

### Auth — `/api/auth/`

| Method | Endpoint              | Description                          | Auth |
|--------|------------------------|---------------------------------------|------|
| POST   | `register/`            | Create an account                     | No   |
| POST   | `login/`                | Exchange email+password for JWT pair  | No   |
| POST   | `refresh/`              | Exchange refresh token for new access | No   |
| GET/PATCH | `me/`                 | View/update own profile               | Yes  |
| POST   | `change-password/`      | Change password                       | Yes  |

### Workspaces — `/api/workspaces/`

| Method | Endpoint                             | Description                                   | Requires |
|--------|----------------------------------------|------------------------------------------------|----------|
| GET    | `/`                                     | List workspaces you belong to                  | Member |
| POST   | `/`                                     | Create a workspace (you become Owner)          | Any authenticated user |
| GET    | `/{id}/`                                | Retrieve workspace                              | Member |
| PATCH  | `/{id}/`                                | Update workspace                                | Admin/Owner |
| DELETE | `/{id}/`                                | Delete workspace                                | Owner |
| GET    | `/{id}/members/`                        | List members + roles                            | Member |
| POST   | `/{id}/members/`                        | Invite an existing user by email                | Admin/Owner |
| PATCH  | `/{id}/members/{membership_id}/`        | Change a member's role                          | Admin/Owner |
| DELETE | `/{id}/members/{membership_id}/`        | Remove a member                                  | Admin/Owner |

Every write action re-checks the requesting user's `Membership.role` for that
specific workspace at the object level — permission checks live in
`workspaces/permissions.py` and are exercised via `has_object_permission`,
not just at the view/method level, so they hold up under DRF's routing.

## Verified locally

Registration → login → workspace creation → invite → role-gated permission
checks (member blocked from edit/delete, 403s returned correctly) have all
been exercised end-to-end against a real PostgreSQL database as part of
building this milestone.

## Next milestones

1. **Projects & Issues** — issue lifecycle (backlog → in progress → review →
   done), assignees, priorities, labels, comments — all scoped to a workspace
   and permission-checked the same way.
2. **Activity feed** — append-only log of workspace events (created, assigned,
   status changed) to power both the dashboard and future AI summarization.
3. **Dashboards & analytics** — aggregate endpoints for velocity, workload
   distribution, overdue items.
4. **AI insights layer** — summarization and priority/workload suggestions
   built on top of the activity feed, exposed as its own `insights` app so it
   stays decoupled from core CRUD.
