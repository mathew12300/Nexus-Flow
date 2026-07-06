# NexusFlow — Frontend (React + Vite)

The client for the Intelligent Work Execution Platform. This milestone covers
authentication and workspace/RBAC management against the Django backend in
`../backend`.

## Stack

- React 19 + Vite
- React Router for client-side routing
- Axios with a JWT access/refresh interceptor (auto-refreshes silently, logs
  out and redirects only if the refresh token itself is invalid/expired)
- Plain CSS with a token system (`src/styles/tokens.css`) — no UI framework,
  so every color/spacing decision is explicit and easy to re-theme

## Design direction

NexusFlow's visual identity is built around the idea of **work as a current,
not a checklist** — the signature `FlowBar` component (used for the team
composition view, and the natural place to extend into issue-status
breakdowns in the next milestone) is a segmented bar with a slow shimmer on
its largest segment, rather than a generic progress ring or bar chart.

- **Type**: Space Grotesk (display/headings) + Inter (body) + IBM Plex Mono
  (data — role tags, slugs, member counts) — a technical, structured pairing
  rather than a single do-everything sans.
- **Color**: cool slate base (#F3F4F7), not the near-black or cream defaults
  — an indigo "flow" accent for momentum/primary actions, teal for
  resolved/current state, amber for at-risk, reserved consistently.
- **Role colors** escalate in weight from viewer (quiet gray) to owner
  (near-black), so the members list and the FlowBar read the same way.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your backend if not localhost:8000
npm run dev
```

The app expects the Django backend (see ../backend/README.md) running at
http://localhost:8000 by default.

## Structure

```
src/
  lib/
    api.js          # axios instance, JWT refresh interceptor, error helper
    endpoints.js     # typed calls: authApi, workspacesApi
  context/
    AuthContext.jsx  # current user, login/register/logout
  components/
    Layout.jsx        # sidebar shell
    AuthLayout.jsx     # split-screen layout for login/register
    FlowBar.jsx        # signature segmented-bar visualization
    RoleBadge.jsx       # role pill + role -> color mapping
    ProtectedRoute.jsx  # redirects to /login if unauthenticated
  pages/
    Login.jsx / Register.jsx
    Workspaces.jsx        # list + create
    WorkspaceDetail.jsx   # members, invites, role changes, RBAC-gated UI
```

## RBAC in the UI

WorkspaceDetail reads workspace.my_role (returned by the API for the
current user) and only renders invite/role-change/remove controls when that
role is owner or admin — mirroring the permission checks already
enforced server-side. The UI hiding these controls is a convenience, not the
security boundary; the backend rejects unauthorized requests regardless.

## Next milestones

Once Projects & Issues land on the backend, this frontend gets a workspace-
scoped board view — the FlowBar pattern established here extends directly
to issue-status distribution (backlog / in progress / review / done).
