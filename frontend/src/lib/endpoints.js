import api, { tokenStore } from './api';

export const authApi = {
  async register({ email, password, full_name }) {
    const { data } = await api.post('/auth/register/', { email, password, full_name });
    return data;
  },
  async login({ email, password }) {
    const { data } = await api.post('/auth/login/', { email, password });
    tokenStore.set(data.access, data.refresh);
    return data;
  },
  async me() {
    if (!tokenStore.getAccess()) {
      const localGuest = localStorage.getItem('nexusflow_guest_user');
      return localGuest ? JSON.parse(localGuest) : { id: 'guest-user-id', email: 'guest@nexusflow.dev', full_name: 'Guest User', display_name: 'Guest' };
    }
    const { data } = await api.get('/auth/me/');
    return data;
  },
  async updateMe(payload) {
    if (!tokenStore.getAccess()) {
      const localGuest = localStorage.getItem('nexusflow_guest_user');
      const guest = localGuest ? JSON.parse(localGuest) : { id: 'guest-user-id', email: 'guest@nexusflow.dev', full_name: 'Guest User', display_name: 'Guest' };
      const updated = { ...guest, ...payload };
      localStorage.setItem('nexusflow_guest_user', JSON.stringify(updated));
      return updated;
    }
    const { data } = await api.patch('/auth/me/', payload);
    return data;
  },
  async changePassword({ old_password, new_password }) {
    if (!tokenStore.getAccess()) {
      return { detail: 'Password updated successfully (Local Playground).' };
    }
    const { data } = await api.post('/auth/change-password/', { old_password, new_password });
    return data;
  },
  logout() {
    tokenStore.clear();
  },
};

const GUEST_WS_KEY = 'nexusflow_guest_workspaces';
const DEFAULT_GUEST_WORKSPACES = [
  {
    id: 'demo-workspace-1',
    name: 'Demo Workspace',
    slug: 'demo-workspace',
    description: 'A playground workspace to explore NexusFlow features.',
    my_role: 'owner',
    member_count: 3,
    members: [
      { id: 'm1', user: { email: 'owner@nexusflow.dev', display_name: 'Workspace Owner' }, role: 'owner' },
      { id: 'm2', user: { email: 'admin@nexusflow.dev', display_name: 'Workspace Admin' }, role: 'admin' },
      { id: 'm3', user: { email: 'guest@nexusflow.dev', display_name: 'Guest User' }, role: 'member' }
    ]
  }
];

function getGuestWorkspaces() {
  const data = localStorage.getItem(GUEST_WS_KEY);
  if (!data) {
    localStorage.setItem(GUEST_WS_KEY, JSON.stringify(DEFAULT_GUEST_WORKSPACES));
    return DEFAULT_GUEST_WORKSPACES;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_GUEST_WORKSPACES;
  }
}

function saveGuestWorkspaces(workspaces) {
  localStorage.setItem(GUEST_WS_KEY, JSON.stringify(workspaces));
}

export const workspacesApi = {
  async list() {
    if (!tokenStore.getAccess()) {
      return getGuestWorkspaces().map(ws => ({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        my_role: ws.my_role,
        member_count: ws.members.length
      }));
    }
    const { data } = await api.get('/workspaces/');
    return data.results ?? data;
  },
  async create({ name, description }) {
    if (!tokenStore.getAccess()) {
      const workspaces = getGuestWorkspaces();
      const id = 'guest-' + Math.random().toString(36).substring(2, 11);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newWs = {
        id,
        name,
        slug: slug || 'workspace',
        description,
        my_role: 'owner',
        members: [
          { id: 'gm-owner', user: { email: 'guest@nexusflow.dev', display_name: 'Guest User' }, role: 'owner' }
        ]
      };
      workspaces.push(newWs);
      saveGuestWorkspaces(workspaces);
      return newWs;
    }
    const { data } = await api.post('/workspaces/', { name, description });
    return data;
  },
  async get(id) {
    if (!tokenStore.getAccess()) {
      const ws = getGuestWorkspaces().find(w => w.id === id);
      if (!ws) throw new Error('Workspace not found');
      return ws;
    }
    const { data } = await api.get(`/workspaces/${id}/`);
    return data;
  },
  async update(id, payload) {
    if (!tokenStore.getAccess()) {
      const workspaces = getGuestWorkspaces();
      const idx = workspaces.findIndex(w => w.id === id);
      if (idx === -1) throw new Error('Workspace not found');
      workspaces[idx] = { ...workspaces[idx], ...payload };
      saveGuestWorkspaces(workspaces);
      return workspaces[idx];
    }
    const { data } = await api.patch(`/workspaces/${id}/`, payload);
    return data;
  },
  async remove(id) {
    if (!tokenStore.getAccess()) {
      const workspaces = getGuestWorkspaces();
      const filtered = workspaces.filter(w => w.id !== id);
      saveGuestWorkspaces(filtered);
      return;
    }
    await api.delete(`/workspaces/${id}/`);
  },
  async members(id) {
    if (!tokenStore.getAccess()) {
      const ws = getGuestWorkspaces().find(w => w.id === id);
      if (!ws) throw new Error('Workspace not found');
      return ws.members;
    }
    const { data } = await api.get(`/workspaces/${id}/members/`);
    return data;
  },
  async invite(id, { email, role }) {
    if (!tokenStore.getAccess()) {
      const workspaces = getGuestWorkspaces();
      const idx = workspaces.findIndex(w => w.id === id);
      if (idx === -1) throw new Error('Workspace not found');
      const ws = workspaces[idx];
      const name = email.split('@')[0];
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      const newMember = {
        id: 'gm-' + Math.random().toString(36).substring(2, 11),
        user: { email, display_name: displayName },
        role
      };
      ws.members.push(newMember);
      saveGuestWorkspaces(workspaces);
      return newMember;
    }
    const { data } = await api.post(`/workspaces/${id}/members/`, { email, role });
    return data;
  },
  async updateMemberRole(id, membershipId, role) {
    if (!tokenStore.getAccess()) {
      const workspaces = getGuestWorkspaces();
      const idx = workspaces.findIndex(w => w.id === id);
      if (idx === -1) throw new Error('Workspace not found');
      const ws = workspaces[idx];
      const mIdx = ws.members.findIndex(m => m.id === membershipId);
      if (mIdx === -1) throw new Error('Member not found');
      ws.members[mIdx].role = role;
      saveGuestWorkspaces(workspaces);
      return ws.members[mIdx];
    }
    const { data } = await api.patch(`/workspaces/${id}/members/${membershipId}/`, { role });
    return data;
  },
  async removeMember(id, membershipId) {
    if (!tokenStore.getAccess()) {
      const workspaces = getGuestWorkspaces();
      const idx = workspaces.findIndex(w => w.id === id);
      if (idx === -1) throw new Error('Workspace not found');
      const ws = workspaces[idx];
      ws.members = ws.members.filter(m => m.id !== membershipId);
      saveGuestWorkspaces(workspaces);
      return;
    }
    await api.delete(`/workspaces/${id}/members/${membershipId}/`);
  },
};

// --- GUEST MOCK SEEDS ---
const GUEST_PROJECTS_KEY = 'nexusflow_guest_projects';
const GUEST_ISSUES_KEY = 'nexusflow_guest_issues';
const GUEST_COMMENTS_KEY = 'nexusflow_guest_comments';
const GUEST_ACTIVITIES_KEY = 'nexusflow_guest_activities';

const DEFAULT_GUEST_PROJECTS = [
  {
    id: 'p-1',
    workspace: 'demo-workspace-1',
    name: 'Website Redesign',
    key: 'WEB',
    description: 'Rebuild client landing page with modern aesthetics.',
    status: 'active',
    creator: { id: 'm1', email: 'owner@nexusflow.dev', display_name: 'Workspace Owner' },
    issue_count: 2
  },
  {
    id: 'p-2',
    workspace: 'demo-workspace-1',
    name: 'Mobile App v2',
    key: 'MOB',
    description: 'React Native application upgrade and push notifications.',
    status: 'active',
    creator: { id: 'm2', email: 'admin@nexusflow.dev', display_name: 'Workspace Admin' },
    issue_count: 1
  }
];

const DEFAULT_GUEST_ISSUES = [
  {
    id: 'i-1',
    workspace: 'demo-workspace-1',
    project: 'p-1',
    project_key: 'WEB',
    project_name: 'Website Redesign',
    sequence_number: 1,
    issue_key: 'WEB-1',
    title: 'Design new navbar UI with blur backgrounds',
    description: 'Use backdrop-filter for premium glassmorphism layout.',
    status: 'in_progress',
    priority: 'high',
    creator: { id: 'm1', email: 'owner@nexusflow.dev', display_name: 'Workspace Owner' },
    assignee: 'm3',
    assignee_details: { id: 'm3', email: 'guest@nexusflow.dev', display_name: 'Guest User' },
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] // tomorrow
  },
  {
    id: 'i-2',
    workspace: 'demo-workspace-1',
    project: 'p-1',
    project_key: 'WEB',
    project_name: 'Website Redesign',
    sequence_number: 2,
    issue_key: 'WEB-2',
    title: 'Integrate Contact Form email notifications',
    description: 'Setup Resend or SendGrid integration.',
    status: 'todo',
    priority: 'medium',
    creator: { id: 'm2', email: 'admin@nexusflow.dev', display_name: 'Workspace Admin' },
    assignee: 'm2',
    assignee_details: { id: 'm2', email: 'admin@nexusflow.dev', display_name: 'Workspace Admin' },
    due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // yesterday (overdue!)
  },
  {
    id: 'i-3',
    workspace: 'demo-workspace-1',
    project: 'p-2',
    project_key: 'MOB',
    project_name: 'Mobile App v2',
    sequence_number: 1,
    issue_key: 'MOB-1',
    title: 'Setup production docker compose',
    description: 'Include postgres, redis, and certbot configuration.',
    status: 'backlog',
    priority: 'urgent',
    creator: { id: 'm1', email: 'owner@nexusflow.dev', display_name: 'Workspace Owner' },
    assignee: null,
    assignee_details: null,
    due_date: null
  }
];

const DEFAULT_GUEST_COMMENTS = [
  {
    id: 'c-1',
    issue: 'i-1',
    author: { id: 'm1', email: 'owner@nexusflow.dev', display_name: 'Workspace Owner' },
    content: "Let's use Outfit or Inter font for the navbar styling.",
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

const DEFAULT_GUEST_ACTIVITIES = [
  {
    id: 'a-1',
    workspace: 'demo-workspace-1',
    user_details: { email: 'owner@nexusflow.dev', display_name: 'Workspace Owner' },
    action: 'created project',
    target_type: 'project',
    target_name: 'Website Redesign',
    details: '',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'a-2',
    workspace: 'demo-workspace-1',
    user_details: { email: 'owner@nexusflow.dev', display_name: 'Workspace Owner' },
    action: 'created issue',
    target_type: 'issue',
    target_name: 'WEB-1',
    details: 'Title: Design new navbar UI with blur backgrounds',
    created_at: new Date(Date.now() - 5400000).toISOString()
  }
];

function getGuestProjects() {
  const d = localStorage.getItem(GUEST_PROJECTS_KEY);
  if (!d) {
    localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(DEFAULT_GUEST_PROJECTS));
    return DEFAULT_GUEST_PROJECTS;
  }
  try { return JSON.parse(d); } catch (e) { return DEFAULT_GUEST_PROJECTS; }
}

function saveGuestProjects(projects) {
  localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(projects));
}

function getGuestIssues() {
  const d = localStorage.getItem(GUEST_ISSUES_KEY);
  if (!d) {
    localStorage.setItem(GUEST_ISSUES_KEY, JSON.stringify(DEFAULT_GUEST_ISSUES));
    return DEFAULT_GUEST_ISSUES;
  }
  try { return JSON.parse(d); } catch (e) { return DEFAULT_GUEST_ISSUES; }
}

function saveGuestIssues(issues) {
  localStorage.setItem(GUEST_ISSUES_KEY, JSON.stringify(issues));
}

function getGuestComments() {
  const d = localStorage.getItem(GUEST_COMMENTS_KEY);
  if (!d) {
    localStorage.setItem(GUEST_COMMENTS_KEY, JSON.stringify(DEFAULT_GUEST_COMMENTS));
    return DEFAULT_GUEST_COMMENTS;
  }
  try { return JSON.parse(d); } catch (e) { return DEFAULT_GUEST_COMMENTS; }
}

function saveGuestComments(comments) {
  localStorage.setItem(GUEST_COMMENTS_KEY, JSON.stringify(comments));
}

function getGuestActivities() {
  const d = localStorage.getItem(GUEST_ACTIVITIES_KEY);
  if (!d) {
    localStorage.setItem(GUEST_ACTIVITIES_KEY, JSON.stringify(DEFAULT_GUEST_ACTIVITIES));
    return DEFAULT_GUEST_ACTIVITIES;
  }
  try { return JSON.parse(d); } catch (e) { return DEFAULT_GUEST_ACTIVITIES; }
}

function saveGuestActivities(activities) {
  localStorage.setItem(GUEST_ACTIVITIES_KEY, JSON.stringify(activities));
}

function logGuestActivity(workspaceId, action, targetType, targetName, details = '') {
  const activities = getGuestActivities();
  const newActivity = {
    id: 'ga-' + Math.random().toString(36).substring(2, 11),
    workspace: workspaceId,
    user_details: { email: 'guest@nexusflow.dev', display_name: 'Guest User' },
    action,
    target_type: targetType,
    target_name: targetName,
    details,
    created_at: new Date().toISOString()
  };
  activities.unshift(newActivity);
  saveGuestActivities(activities);
}

// --- EXPORTED APIS ---

export const projectsApi = {
  async list(workspaceId) {
    if (!tokenStore.getAccess()) {
      return getGuestProjects().filter(p => p.workspace === workspaceId);
    }
    const { data } = await api.get(`/projects/?workspace=${workspaceId}`);
    return data.results ?? data;
  },
  async create({ workspace, name, key, description }) {
    if (!tokenStore.getAccess()) {
      const projects = getGuestProjects();
      const newProj = {
        id: 'p-' + Math.random().toString(36).substring(2, 11),
        workspace,
        name,
        key: key.toUpperCase(),
        description,
        status: 'active',
        creator: { id: 'm3', email: 'guest@nexusflow.dev', display_name: 'Guest User' },
        issue_count: 0
      };
      projects.push(newProj);
      saveGuestProjects(projects);
      logGuestActivity(workspace, 'created project', 'project', name);
      return newProj;
    }
    const { data } = await api.post('/projects/', { workspace, name, key, description });
    return data;
  },
  async remove(id) {
    if (!tokenStore.getAccess()) {
      const projects = getGuestProjects();
      const proj = projects.find(p => p.id === id);
      const filtered = projects.filter(p => p.id !== id);
      saveGuestProjects(filtered);
      if (proj) {
        logGuestActivity(proj.workspace, 'deleted project', 'project', proj.name);
      }
      return;
    }
    await api.delete(`/projects/${id}/`);
  }
};

export const issuesApi = {
  async list({ workspace, project, status }) {
    if (!tokenStore.getAccess()) {
      let issues = getGuestIssues().filter(i => i.workspace === workspace);
      if (project) issues = issues.filter(i => i.project === project);
      if (status) issues = issues.filter(i => i.status === status);
      return issues;
    }
    let url = `/issues/?workspace=${workspace}`;
    if (project) url += `&project=${project}`;
    if (status) url += `&status=${status}`;
    const { data } = await api.get(url);
    return data.results ?? data;
  },
  async create(payload) {
    if (!tokenStore.getAccess()) {
      const issues = getGuestIssues();
      const projects = getGuestProjects();
      const proj = projects.find(p => p.id === payload.project);
      if (!proj) throw new Error('Project not found');

      const projectIssues = issues.filter(i => i.project === payload.project);
      const seq = projectIssues.length + 1;
      const key = `${proj.key}-${seq}`;

      const members = getGuestWorkspaces().find(w => w.id === payload.workspace)?.members || [];
      const assigneeDetails = members.find(m => m.id === payload.assignee)?.user || null;

      const newIssue = {
        id: 'i-' + Math.random().toString(36).substring(2, 11),
        workspace: payload.workspace,
        project: payload.project,
        project_key: proj.key,
        project_name: proj.name,
        sequence_number: seq,
        issue_key: key,
        title: payload.title,
        description: payload.description || '',
        status: payload.status || 'todo',
        priority: payload.priority || 'none',
        creator: { id: 'm3', email: 'guest@nexusflow.dev', display_name: 'Guest User' },
        assignee: payload.assignee || null,
        assignee_details: assigneeDetails,
        due_date: payload.due_date || null
      };

      issues.push(newIssue);
      saveGuestIssues(issues);
      logGuestActivity(payload.workspace, 'created issue', 'issue', key, `Title: ${payload.title}`);
      return newIssue;
    }
    const { data } = await api.post('/issues/', payload);
    return data;
  },
  async update(id, payload) {
    if (!tokenStore.getAccess()) {
      const issues = getGuestIssues();
      const idx = issues.findIndex(i => i.id === id);
      if (idx === -1) throw new Error('Issue not found');

      const members = getGuestWorkspaces().find(w => w.id === issues[idx].workspace)?.members || [];
      let assigneeDetails = issues[idx].assignee_details;
      if (payload.assignee !== undefined) {
        assigneeDetails = members.find(m => m.id === payload.assignee)?.user || null;
      }

      issues[idx] = {
        ...issues[idx],
        ...payload,
        assignee_details: assigneeDetails
      };
      saveGuestIssues(issues);

      const issue = issues[idx];
      const assigneeEmail = assigneeDetails ? assigneeDetails.email : 'None';
      logGuestActivity(
        issue.workspace,
        'updated issue',
        'issue',
        issue.issue_key,
        `Status: ${issue.status}, Priority: ${issue.priority}, Assignee: ${assigneeEmail}`
      );
      return issue;
    }
    const { data } = await api.patch(`/issues/${id}/`, payload);
    return data;
  },
  async remove(id) {
    if (!tokenStore.getAccess()) {
      const issues = getGuestIssues();
      const issue = issues.find(i => i.id === id);
      const filtered = issues.filter(i => i.id !== id);
      saveGuestIssues(filtered);
      if (issue) {
        logGuestActivity(issue.workspace, 'deleted issue', 'issue', issue.issue_key);
      }
      return;
    }
    await api.delete(`/issues/${id}/`);
  }
};

export const commentsApi = {
  async list(issueId) {
    if (!tokenStore.getAccess()) {
      return getGuestComments().filter(c => c.issue === issueId);
    }
    const { data } = await api.get(`/comments/?issue=${issueId}`);
    return data.results ?? data;
  },
  async create({ issue: issueId, content }) {
    if (!tokenStore.getAccess()) {
      const comments = getGuestComments();
      const issues = getGuestIssues();
      const issue = issues.find(i => i.id === issueId);
      if (!issue) throw new Error('Issue not found');

      const newComment = {
        id: 'c-' + Math.random().toString(36).substring(2, 11),
        issue: issueId,
        author: { id: 'm3', email: 'guest@nexusflow.dev', display_name: 'Guest User' },
        content,
        created_at: new Date().toISOString()
      };
      comments.push(newComment);
      saveGuestComments(comments);
      logGuestActivity(issue.workspace, 'commented on', 'issue', issue.issue_key, content.substring(0, 100));
      return newComment;
    }
    const { data } = await api.post('/comments/', { issue: issueId, content });
    return data;
  }
};

export const activityApi = {
  async list(workspaceId) {
    if (!tokenStore.getAccess()) {
      return getGuestActivities().filter(a => a.workspace === workspaceId);
    }
    const { data } = await api.get(`/activity/?workspace=${workspaceId}`);
    return data.results ?? data;
  }
};

export const insightsApi = {
  async analytics(workspaceId) {
    if (!tokenStore.getAccess()) {
      const issues = getGuestIssues().filter(i => i.workspace === workspaceId);
      const projects = getGuestProjects().filter(p => p.workspace === workspaceId);

      const statusCounts = { backlog: 0, todo: 0, in_progress: 0, done: 0, canceled: 0 };
      const priorityCounts = { none: 0, low: 0, medium: 0, high: 0, urgent: 0 };

      issues.forEach(i => {
        if (statusCounts[i.status] !== undefined) statusCounts[i.status]++;
        if (priorityCounts[i.priority] !== undefined) priorityCounts[i.priority]++;
      });

      const today = new Date().toISOString().split('T')[0];
      const overdueIssues = issues.filter(i => !['done', 'canceled'].includes(i.status) && i.due_date && i.due_date < today);

      const overdueList = overdueIssues.map(i => ({
        id: i.id,
        issue_key: i.issue_key,
        title: i.title,
        due_date: i.due_date,
        priority: i.priority
      }));

      const doneCount = statusCounts.done;
      const totalCount = issues.length;
      const rate = totalCount > 0 ? Math.round((doneCount / totalCount * 100) * 10) / 10 : 0.0;

      const members = getGuestWorkspaces().find(w => w.id === workspaceId)?.members || [];
      const workloads = members.map(m => {
        const count = issues.filter(i => i.assignee === m.id && !['done', 'canceled'].includes(i.status)).length;
        return {
          id: m.id,
          email: m.user.email,
          display_name: m.user.display_name,
          issue_count: count
        };
      });

      const unassignedCount = issues.filter(i => !i.assignee && !['done', 'canceled'].includes(i.status)).length;
      workloads.push({
        id: null,
        email: 'unassigned@nexusflow.dev',
        display_name: 'Unassigned',
        issue_count: unassignedCount
      });

      return {
        total_projects: projects.length,
        total_issues: totalCount,
        status_counts: statusCounts,
        priority_counts: priorityCounts,
        overdue_count: overdueIssues.length,
        overdue_issues: overdueList,
        completion_rate: rate,
        workloads
      };
    }
    const { data } = await api.get(`/workspaces/${workspaceId}/analytics/`);
    return data;
  },
  async aiInsights(workspaceId) {
    if (!tokenStore.getAccess()) {
      const issues = getGuestIssues().filter(i => i.workspace === workspaceId);
      const activeIssues = issues.filter(i => !['done', 'canceled'].includes(i.status));
      const today = new Date().toISOString().split('T')[0];

      const warnings = [];
      const bottlenecks = [];
      const recommendations = [];

      const members = getGuestWorkspaces().find(w => w.id === workspaceId)?.members || [];
      members.forEach(m => {
        const count = activeIssues.filter(i => i.assignee === m.id).length;
        if (count > 3) {
          warnings.push(`Resource Alert: **${m.user.display_name}** has ${count} active tasks assigned. Consider redistributing workload to prevent developer burnout.`);
        }
      });

      const overdueCritical = activeIssues.filter(i => i.due_date && i.due_date < today && ['high', 'urgent'].includes(i.priority));
      if (overdueCritical.length > 0) {
        const keys = overdueCritical.map(i => i.issue_key).join(', ');
        bottlenecks.push(`SLA Breach Risk: Critical tasks **${keys}** are past due dates. Immediate developer intervention is advised.`);
      }

      const backlogCount = activeIssues.filter(i => i.status === 'backlog').length;
      if (backlogCount > 5) {
        recommendations.push(`Backlog Growth: There are ${backlogCount} items lingering in the Backlog. Schedule a refinement session to prune outdated stories.`);
      }

      const doneCount = issues.filter(i => i.status === 'done').length;
      const totalCount = issues.length;
      const rate = totalCount > 0 ? Math.round((doneCount / totalCount * 100) * 10) / 10 : 0.0;

      if (rate > 75) {
        recommendations.push("Velocity Status: Team efficiency is excellent. Your sprint completion rate is above 75%.");
      } else if (rate > 0) {
        recommendations.push("Sprint Alignment: Focus on moving tasks in 'In Progress' to 'Done' before pulling in new backlog items.");
      }

      if (warnings.length === 0) {
        recommendations.push("Workload Balance: Core tasks are evenly distributed among workspace members.");
      }
      if (bottlenecks.length === 0) {
        recommendations.push("Timeline Status: No immediate delivery blocks or overdue critical tasks detected.");
      }

      return {
        warnings,
        bottlenecks,
        recommendations,
        summary: `AI analysis completed for Demo Workspace. Your velocity is currently at ${rate}% with ${activeIssues.length} unresolved issue(s).`
      };
    }
    const { data } = await api.get(`/workspaces/${workspaceId}/ai-insights/`);
    return data;
  }
};
