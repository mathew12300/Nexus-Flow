# NexusFlow — Intelligent Work Execution Platform

A production-style full-stack SaaS platform for team project management,
built to demonstrate real product architecture rather than tutorial CRUD:
structured workspaces, role-based access control, live progress tracking,
and (in later milestones) analytics and AI-assisted decision support.

```
nexusflow/
  backend/    Django REST Framework API — auth, workspaces, RBAC (PostgreSQL)
  frontend/   React + Vite client — auth flow, workspace/member management
```

## Milestone 1 (current): Auth + Workspaces + Role-Based Access

**Backend** (`backend/`) — custom email-based JWT auth, `Workspace` +
`Membership` models with workspace-scoped roles (owner/admin/member/viewer),
invite/manage-member endpoints, all permission-checked at the object level.
See `backend/README.md` for the full API reference and architecture notes.

**Frontend** (`frontend/`) — login/register, workspace list + creation,
workspace detail page with member invites, role changes, and removal, all
gated in the UI by the current user's role (and enforced again server-side).
See `frontend/README.md` for the component structure and design rationale.

## Running it locally

You need PostgreSQL running and two terminals.

```bash
# 1. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your DB credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# 2. Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: http://localhost:5173 · API docs: http://localhost:8000/api/docs/

## Roadmap

1. ~~Auth + Workspaces + RBAC~~ (this milestone)
2. Projects & Issues — full issue lifecycle, assignees, priorities, comments
3. Activity feed — append-only event log per workspace
4. Dashboards & analytics — velocity, workload distribution, overdue items
5. AI insights layer — summarization, priority suggestions, workload balancing
