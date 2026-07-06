import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import RoleBadge from '../components/RoleBadge';
import {
  workspacesApi,
  projectsApi,
  issuesApi,
  commentsApi,
  activityApi,
  insightsApi
} from '../lib/endpoints';
import { extractApiError } from '../lib/api';
import { triggerConfetti } from '../lib/confetti';

const STATUS_COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: '#6b7280' },
  { key: 'todo', label: 'Todo', color: '#3b82f6' },
  { key: 'in_progress', label: 'In Progress', color: '#a855f7' },
  { key: 'done', label: 'Done', color: '#10b981' },
  { key: 'canceled', label: 'Canceled', color: '#ef4444' }
];

const PRIORITIES = [
  { key: 'none', label: 'None', color: '#9ca3af' },
  { key: 'low', label: 'Low', color: '#10b981' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'high', label: 'High', color: '#f97316' },
  { key: 'urgent', label: 'Urgent', color: '#ef4444' }
];

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core Data
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activities, setActivities] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState('board'); // board, projects, issues, activity, analytics, ai, members
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleTabChange = (e) => {
      setActiveTab(e.detail);
    };
    const handleSearch = (e) => {
      setSearchQuery(e.detail);
    };
    const handleTriggerCreate = () => {
      setShowCreateIssue(true);
    };

    window.addEventListener('change-tab', handleTabChange);
    window.addEventListener('global-search', handleSearch);
    window.addEventListener('trigger-create-issue', handleTriggerCreate);

    return () => {
      window.removeEventListener('change-tab', handleTabChange);
      window.removeEventListener('global-search', handleSearch);
      window.removeEventListener('trigger-create-issue', handleTriggerCreate);
    };
  }, []);

  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues;
    const q = searchQuery.toLowerCase();
    return issues.filter(issue => 
      issue.title.toLowerCase().includes(q) ||
      (issue.description && issue.description.toLowerCase().includes(q)) ||
      issue.issue_key.toLowerCase().includes(q)
    );
  }, [issues, searchQuery]);

  // Modals & Forms
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueComments, setIssueComments] = useState([]);
  const [commentForm, setCommentForm] = useState('');
  const [commenting, setCommenting] = useState(false);

  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    project: '',
    status: 'todo',
    priority: 'none',
    assignee: '',
    due_date: ''
  });
  const [creatingIssue, setCreatingIssue] = useState(false);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', key: '', description: '' });
  const [creatingProject, setCreatingProject] = useState(false);

  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const canManage = workspace?.my_role === 'owner' || workspace?.my_role === 'admin';
  const isOwner = workspace?.my_role === 'owner';

  // Load all workspace components
  const loadWorkspaceData = useCallback(async () => {
    try {
      setError('');
      const [ws, mems, projs, iss, acts] = await Promise.all([
        workspacesApi.get(id),
        workspacesApi.members(id),
        projectsApi.list(id),
        issuesApi.list({ workspace: id }),
        activityApi.list(id)
      ]);
      setWorkspace(ws);
      setMembers(mems);
      setProjects(projs);
      setIssues(iss);
      setActivities(acts);

      // Pre-select first project in issue form
      if (projs.length > 0 && !issueForm.project) {
        setIssueForm(prev => ({ ...prev, project: projs[0].id }));
      }
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [id, issueForm.project]);

  // Load Analytics specifically
  const loadAnalytics = useCallback(async () => {
    try {
      const data = await insightsApi.analytics(id);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  // Run AI analysis
  const runAIAnalysis = async () => {
    setLoadingInsights(true);
    setAiInsights(null);
    try {
      const data = await insightsApi.aiInsights(id);
      setAiInsights(data);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    } else if (activeTab === 'ai' && !aiInsights && !loadingInsights) {
      runAIAnalysis();
    }
  }, [activeTab, loadAnalytics, aiInsights, loadingInsights]);

  // Modal Comments Loader
  const loadIssueComments = async (issueId) => {
    try {
      const comments = await commentsApi.list(issueId);
      setIssueComments(comments);
    } catch (err) {
      console.error(err);
    }
  };

  // Open Issue Modal
  const openIssueModal = (issue) => {
    setSelectedIssue(issue);
    loadIssueComments(issue.id);
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentForm.trim()) return;
    setCommenting(true);
    try {
      const newComment = await commentsApi.create({
        issue: selectedIssue.id,
        content: commentForm
      });
      setIssueComments(prev => [...prev, newComment]);
      setCommentForm('');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setCommenting(false);
    }
  };

  // Issue Create
  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.project) {
      setError('Please create a project first.');
      return;
    }
    setCreatingIssue(true);
    try {
      await issuesApi.create({
        workspace: id,
        ...issueForm,
        assignee: issueForm.assignee || null
      });
      setIssueForm({
        title: '',
        description: '',
        project: projects[0]?.id || '',
        status: 'todo',
        priority: 'none',
        assignee: '',
        due_date: ''
      });
      setShowCreateIssue(false);
      await loadWorkspaceData();
      if (activeTab === 'analytics') loadAnalytics();
      if (aiInsights) runAIAnalysis();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setCreatingIssue(false);
    }
  };

  // Issue Update Status directly (Board DnD click simulation)
  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await issuesApi.update(issueId, { status: newStatus });
      if (newStatus === 'done') {
        triggerConfetti();
      }
      await loadWorkspaceData();
      if (activeTab === 'analytics') loadAnalytics();
      if (aiInsights) runAIAnalysis();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  // Detailed Issue fields change (Modal)
  const handleUpdateIssueField = async (field, value) => {
    try {
      const updated = await issuesApi.update(selectedIssue.id, { [field]: value });
      setSelectedIssue(updated);
      if (field === 'status' && value === 'done') {
        triggerConfetti();
      }
      await loadWorkspaceData();
      if (activeTab === 'analytics') loadAnalytics();
      if (aiInsights) runAIAnalysis();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  // Delete Issue
  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    try {
      await issuesApi.remove(issueId);
      setSelectedIssue(null);
      await loadWorkspaceData();
      if (activeTab === 'analytics') loadAnalytics();
      if (aiInsights) runAIAnalysis();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  // Project Create
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreatingProject(true);
    try {
      await projectsApi.create({
        workspace: id,
        ...projectForm
      });
      setProjectForm({ name: '', key: '', description: '' });
      setShowCreateProject(false);
      await loadWorkspaceData();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setCreatingProject(false);
    }
  };

  // Project Delete
  const handleDeleteProject = async (projId) => {
    if (!window.confirm('Delete project? This will delete all its issues too.')) return;
    try {
      await projectsApi.remove(projId);
      await loadWorkspaceData();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  // Invite member
  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setNotice('');
    try {
      await workspacesApi.invite(id, inviteForm);
      setInviteForm({ email: '', role: 'member' });
      setShowInvite(false);
      setNotice('Member added to the workspace.');
      await loadWorkspaceData();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setInviting(false);
    }
  };

  // Delete workspace
  const handleDeleteWorkspace = async () => {
    if (!window.confirm(`Delete "${workspace.name}"? This cannot be undone.`)) return;
    try {
      await workspacesApi.remove(id);
      navigate('/workspaces');
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  // Role Changes
  const handleRoleChange = async (membershipId, role) => {
    setError('');
    try {
      await workspacesApi.updateMemberRole(id, membershipId, role);
      await loadWorkspaceData();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handleRemoveMember = async (membershipId) => {
    setError('');
    try {
      await workspacesApi.removeMember(id, membershipId);
      await loadWorkspaceData();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  if (!workspace) {
    return (
      <Layout>
        <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
          <div className="skeleton" style={{ width: 240, height: 32 }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header Panel */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="row" style={{ gap: 12 }}>
            <h1>{workspace.name}</h1>
            <span className="badge" style={{ fontSize: 13, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              {workspace.my_role ? workspace.my_role.toUpperCase() : 'GUEST'}
            </span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>{workspace.description || 'No workspace description.'}</p>
        </div>
        {isOwner && (
          <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={handleDeleteWorkspace}>
            Delete Workspace
          </button>
        )}
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}
      {notice && <div className="notice-banner" style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: 6 }}>{notice}</div>}

      {/* Navigation Tabs */}
      <div className="row" style={{ borderBottom: '1px solid var(--border)', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        {[
          { key: 'board', label: 'Kanban Board' },
          { key: 'projects', label: 'Projects' },
          { key: 'issues', label: 'Issues List' },
          { key: 'activity', label: 'Activity Feed' },
          { key: 'analytics', label: 'Analytics' },
          { key: 'ai', label: 'AI Assistant ✨' },
          { key: 'members', label: 'Members' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', borderRadius: '6px 6px 0 0', borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : 'none', fontWeight: 500 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT LAYOUTS --- */}

      {/* 1. KANBAN BOARD */}
      {activeTab === 'board' && (
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>Workspace Taskboard</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateIssue(true)}>
              + Create Issue
            </button>
          </div>

          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'start' }}>
            {STATUS_COLUMNS.map(col => {
              const colIssues = filteredIssues.filter(i => i.status === col.key);
              return (
                <div key={col.key} className="card" style={{ flex: '1 0 250px', minWidth: 250, background: 'var(--surface-sunken)', border: '1px solid var(--line)', padding: 16, borderRadius: 12, minHeight: 480 }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16, borderBottom: `2px solid ${col.color}`, paddingBottom: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>{col.label}</h3>
                    <span className="counter" style={{ background: 'var(--line-strong)', color: 'var(--ink)', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                      {colIssues.length}
                    </span>
                  </div>

                  <div className="stack" style={{ gap: 10 }}>
                    {colIssues.map(issue => (
                      <div
                        key={issue.id}
                        onClick={() => openIssueModal(issue)}
                        className="card"
                        style={{
                          background: 'var(--surface)',
                          padding: 14,
                          borderRadius: 8,
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-card)',
                          border: '1px solid var(--line)',
                          textAlign: 'left'
                        }}
                      >
                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>{issue.issue_key}</span>
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              background: PRIORITIES.find(p => p.key === issue.priority)?.color + '1F',
                              color: PRIORITIES.find(p => p.key === issue.priority)?.color,
                              padding: '2px 6px',
                              borderRadius: 4
                            }}
                          >
                            {issue.priority.toUpperCase()}
                          </span>
                        </div>
                        <h4 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px', color: 'var(--text-h)' }}>{issue.title}</h4>
                        <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text)' }}>
                          <span>{issue.assignee_details?.display_name || 'Unassigned'}</span>
                          {issue.due_date && (
                            <span style={{ color: new Date(issue.due_date) < new Date() && issue.status !== 'done' ? '#ef4444' : 'inherit' }}>
                              {issue.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {colIssues.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--text)', border: '1px dashed var(--border)', borderRadius: 6 }}>
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
            <h2>Projects</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateProject(true)}>
              New Project
            </button>
          </div>

          {showCreateProject && (
            <form onSubmit={handleCreateProject} className="card" style={{ padding: 20, marginBottom: 20 }}>
              <div className="stack" style={{ gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Project Name</label>
                    <input
                      required
                      placeholder="e.g. Website Overhaul"
                      value={projectForm.name}
                      onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Key</label>
                    <input
                      required
                      maxLength={10}
                      placeholder="e.g. WEB"
                      value={projectForm.key}
                      onChange={e => setProjectForm({ ...projectForm, key: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Description (optional)</label>
                  <input
                    placeholder="Short description of the project"
                    value={projectForm.description}
                    onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                  />
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <button type="submit" className="btn btn-primary" disabled={creatingProject}>
                    {creatingProject ? 'Creating...' : 'Create Project'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreateProject(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {projects.map(proj => (
              <div key={proj.id} className="card" style={{ padding: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>{proj.name}</h3>
                    <span className="badge" style={{ background: 'var(--code-bg)', color: 'var(--text-h)', fontWeight: 600 }}>{proj.key}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>{proj.description || 'No description provided.'}</p>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 13 }}>
                  <span className="muted">{proj.issue_count || 0} issue{proj.issue_count === 1 ? '' : 's'}</span>
                  <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', padding: '2px 8px' }} onClick={() => handleDeleteProject(proj.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="card" style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1' }}>
                <h3>No projects yet</h3>
                <p className="muted" style={{ marginTop: 8 }}>Projects act as buckets for related tasks and issues.</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreateProject(true)}>
                  Create first project
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ISSUES LIST TAB */}
      {activeTab === 'issues' && (
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
            <h2>All Issues</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateIssue(true)}>
              + New Issue
            </button>
          </div>

          <div className="card" style={{ padding: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-h)', fontSize: 14 }}>
                  <th style={{ padding: 12 }}>Key</th>
                  <th style={{ padding: 12 }}>Title</th>
                  <th style={{ padding: 12 }}>Project</th>
                  <th style={{ padding: 12 }}>Status</th>
                  <th style={{ padding: 12 }}>Priority</th>
                  <th style={{ padding: 12 }}>Assignee</th>
                  <th style={{ padding: 12 }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map(issue => (
                  <tr
                    key={issue.id}
                    onClick={() => openIssueModal(issue)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
                    className="workspace-row"
                  >
                    <td style={{ padding: 12, fontWeight: 600, color: 'var(--accent)' }}>{issue.issue_key}</td>
                    <td style={{ padding: 12, color: 'var(--text-h)' }}>{issue.title}</td>
                    <td style={{ padding: 12 }}>{issue.project_name}</td>
                    <td style={{ padding: 12 }}>
                      <span className="badge" style={{ background: STATUS_COLUMNS.find(c => c.key === issue.status)?.color + '1F', color: STATUS_COLUMNS.find(c => c.key === issue.status)?.color }}>
                        {STATUS_COLUMNS.find(c => c.key === issue.status)?.label}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span className="badge" style={{ background: PRIORITIES.find(p => p.key === issue.priority)?.color + '1F', color: PRIORITIES.find(p => p.key === issue.priority)?.color }}>
                        {PRIORITIES.find(p => p.key === issue.priority)?.label}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{issue.assignee_details?.display_name || 'Unassigned'}</td>
                    <td style={{ padding: 12 }}>{issue.due_date || 'None'}</td>
                  </tr>
                ))}
                {filteredIssues.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text)' }}>
                      No issues created in this workspace yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ACTIVITY TIMELINE */}
      {activeTab === 'activity' && (
        <div>
          <h2>Activity Log</h2>
          <div className="stack" style={{ gap: 16, marginTop: 20 }}>
            {activities.map((act) => (
              <div
                key={act.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  borderLeft: '4px solid var(--accent)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                    <span>{act.user_details?.display_name || 'Guest User'}</span>{' '}
                    <span className="muted" style={{ fontWeight: 400 }}>{act.action}</span>{' '}
                    <strong style={{ color: 'var(--accent)' }}>{act.target_name}</strong>
                  </div>
                  {act.details && (
                    <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text)', background: 'var(--code-bg)', padding: '6px 12px', borderRadius: 4 }}>
                      {act.details}
                    </div>
                  )}
                </div>
                <span className="faint" style={{ fontSize: 12 }}>
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <p className="muted">No activity has been recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="stack" style={{ gap: 24 }}>
          {/* Top Aggregates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <span className="muted" style={{ fontSize: 13 }}>Completion Rate</span>
              <h1 style={{ fontSize: 36, margin: '8px 0 12px' }}>{analytics.completion_rate}%</h1>
              <div style={{ background: 'var(--border)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ background: 'var(--accent)', width: `${analytics.completion_rate}%`, height: '100%' }} />
              </div>
            </div>
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <span className="muted" style={{ fontSize: 13 }}>Total Issues</span>
              <h1 style={{ fontSize: 36, margin: '8px 0' }}>{analytics.total_issues}</h1>
              <span className="badge" style={{ background: 'var(--code-bg)', color: 'var(--text-h)' }}>
                {analytics.total_projects} active project{analytics.total_projects === 1 ? '' : 's'}
              </span>
            </div>
            <div className="card" style={{ padding: 20, textAlign: 'center', borderColor: analytics.overdue_count > 0 ? '#ef4444' : 'var(--border)' }}>
              <span className="muted" style={{ fontSize: 13 }}>Overdue Issues</span>
              <h1 style={{ fontSize: 36, margin: '8px 0', color: analytics.overdue_count > 0 ? '#ef4444' : 'inherit' }}>
                {analytics.overdue_count}
              </h1>
              <span className="badge" style={{ background: analytics.overdue_count > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--code-bg)', color: analytics.overdue_count > 0 ? '#ef4444' : 'var(--text)' }}>
                Requires Action
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {/* Status Breakdown */}
            <div className="card" style={{ padding: 20, textAlign: 'left' }}>
              <h3 style={{ marginBottom: 16 }}>Status Breakdown</h3>
              <div className="stack" style={{ gap: 12 }}>
                {STATUS_COLUMNS.map(col => {
                  const val = analytics.status_counts[col.key] || 0;
                  const pct = analytics.total_issues > 0 ? (val / analytics.total_issues * 100) : 0;
                  return (
                    <div key={col.key}>
                      <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-h)' }}>{col.label}</span>
                        <span>{val} ({Math.round(pct)}%)</span>
                      </div>
                      <div style={{ background: 'var(--border)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ background: col.color, width: `${pct}%`, height: '100%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Workload */}
            <div className="card" style={{ padding: 20, textAlign: 'left' }}>
              <h3 style={{ marginBottom: 16 }}>Active Issues per Member</h3>
              <div className="stack" style={{ gap: 12 }}>
                {analytics.workloads.map(member => (
                  <div key={member.id || 'unassigned'} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-h)', fontSize: 14 }}>{member.display_name}</div>
                      <div className="faint" style={{ fontSize: 12 }}>{member.email}</div>
                    </div>
                    <span className="badge" style={{ background: member.issue_count > 3 ? 'rgba(239, 68, 68, 0.1)' : 'var(--code-bg)', color: member.issue_count > 3 ? '#ef4444' : 'var(--text-h)', fontSize: 13, fontWeight: 600 }}>
                      {member.issue_count} active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overdue list detail */}
          {analytics.overdue_count > 0 && (
            <div className="card" style={{ padding: 20, textAlign: 'left', borderColor: '#ef4444' }}>
              <h3 style={{ color: '#ef4444', marginBottom: 12 }}>Overdue Tasks Listing</h3>
              <div className="stack" style={{ gap: 8 }}>
                {analytics.overdue_issues.map(iss => (
                  <div key={iss.id} className="row" style={{ justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.03)', padding: 12, borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <div>
                      <strong style={{ color: 'var(--accent)', fontSize: 13 }}>{iss.issue_key}</strong>
                      <div style={{ color: 'var(--text-h)', fontSize: 14, marginTop: 2 }}>{iss.title}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11 }}>
                        Due: {iss.due_date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. AI INSIGHTS TAB */}
      {activeTab === 'ai' && (
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
            <h2>AI Workload Assistant ✨</h2>
            <button className="btn btn-primary" onClick={runAIAnalysis} disabled={loadingInsights}>
              {loadingInsights ? 'Analyzing...' : 'Refresh AI Audit'}
            </button>
          </div>

          {loadingInsights && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ margin: '0 auto 16px', border: '4px solid var(--border)', borderTop: '4px solid var(--accent)', borderRadius: '50%', width: 36, height: 36, animation: 'spin 1s linear infinite' }} />
              <p className="muted">Running heuristic algorithms, analyzing workloads, and scanning due dates...</p>
            </div>
          )}

          {!loadingInsights && aiInsights && (
            <div className="stack" style={{ gap: 20, textAlign: 'left' }}>
              {/* Summary panel */}
              <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--accent-bg) 0%, rgba(255,255,255,0) 100%)', border: '1px solid var(--accent-border)' }}>
                <h3 style={{ margin: 0, color: 'var(--text-h)' }}>NexusFlow AI Summary</h3>
                <p style={{ marginTop: 8, fontSize: 15, color: 'var(--text-h)', lineHeight: '145%' }}>{aiInsights.summary}</p>
              </div>

              {/* Critical bottlenecks */}
              {aiInsights.bottlenecks.length > 0 && (
                <div className="card" style={{ padding: 20, borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.02)' }}>
                  <h3 style={{ color: '#ef4444', margin: '0 0 12px' }}>Critical Bottlenecks</h3>
                  <div className="stack" style={{ gap: 10 }}>
                    {aiInsights.bottlenecks.map((bot, i) => (
                      <div key={i} dangerouslySetInnerHTML={{ __html: bot.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} style={{ fontSize: 14, color: 'var(--text-h)' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Resource Warnings */}
              {aiInsights.warnings.length > 0 && (
                <div className="card" style={{ padding: 20, borderColor: '#f97316', background: 'rgba(249, 115, 22, 0.02)' }}>
                  <h3 style={{ color: '#f97316', margin: '0 0 12px' }}>Resource & Allocation Warnings</h3>
                  <div className="stack" style={{ gap: 10 }}>
                    {aiInsights.warnings.map((warn, i) => (
                      <div key={i} dangerouslySetInnerHTML={{ __html: warn.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} style={{ fontSize: 14, color: 'var(--text-h)' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px' }}>Actionable Recommendations</h3>
                <div className="stack" style={{ gap: 12 }}>
                  {aiInsights.recommendations.map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
                      <span style={{ color: 'var(--accent)' }}>✦</span>
                      <div style={{ color: 'var(--text-h)' }}>{rec}</div>
                    </div>
                  ))}
                  {aiInsights.recommendations.length === 0 && (
                    <p className="muted" style={{ fontSize: 14 }}>No immediate recommendation changes required.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. MEMBERS TAB (Original View) */}
      {activeTab === 'members' && (
        <div className="stack" style={{ gap: 24 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Members ({members.length})</h2>
            {canManage && (
              <button className="btn btn-primary" onClick={() => setShowInvite(v => !v)}>
                {showInvite ? 'Cancel' : 'Invite member'}
              </button>
            )}
          </div>

          {showInvite && (
            <form onSubmit={handleInvite} className="card" style={{ padding: 24 }}>
              <div className="row" style={{ gap: 16, alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 2 }}>
                  <label htmlFor="invite-email">Email address</label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="invite-role">Role</label>
                  <select
                    id="invite-role"
                    value={inviteForm.role}
                    onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                    style={{ width: '100%', height: 40, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', padding: '0 10px' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={inviting} style={{ height: 40 }}>
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}

          <div className="card" style={{ padding: 12 }}>
            <div className="stack" style={{ gap: 8 }}>
              {members.map(member => (
                <div key={member.id} className="row" style={{ justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div className="row" style={{ gap: 12 }}>
                    <div className="avatar">{(member.user.display_name || '?').slice(0, 1).toUpperCase()}</div>
                    <div className="stack" style={{ textAlign: 'left' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-h)', fontSize: 15 }}>{member.user.display_name}</span>
                      <span className="muted" style={{ fontSize: 13 }}>{member.user.email}</span>
                    </div>
                  </div>

                  <div className="row" style={{ gap: 12 }}>
                    {canManage && member.role !== 'owner' && member.user.id !== workspace.owner_id ? (
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member.id, e.target.value)}
                        style={{ height: 32, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', padding: '0 8px', fontSize: 13 }}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}

                    {canManage && member.role !== 'owner' && member.user.id !== workspace.owner_id && (
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', padding: '4px 8px' }} onClick={() => handleRemoveMember(member.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- POPUPS & MODALS --- */}

      {/* CREATE ISSUE DIALOG */}
      {showCreateIssue && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: 500, padding: 24, textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px' }}>Create New Issue</h3>
            <form onSubmit={handleCreateIssue} className="stack" style={{ gap: 16 }}>
              <div className="field">
                <label>Issue Title</label>
                <input
                  required
                  placeholder="e.g. Implement authentication callback"
                  value={issueForm.title}
                  onChange={e => setIssueForm({ ...issueForm, title: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  placeholder="Provide context or instructions"
                  value={issueForm.description}
                  onChange={e => setIssueForm({ ...issueForm, description: e.target.value })}
                  style={{ width: '100%', minHeight: 80, borderRadius: 6, border: '1px solid var(--border)', padding: 10, background: 'var(--bg)', color: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Project</label>
                  <select
                    required
                    value={issueForm.project}
                    onChange={e => setIssueForm({ ...issueForm, project: e.target.value })}
                    style={{ width: '100%', height: 40, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', padding: '0 8px' }}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select
                    value={issueForm.priority}
                    onChange={e => setIssueForm({ ...issueForm, priority: e.target.value })}
                    style={{ width: '100%', height: 40, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', padding: '0 8px' }}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Assignee</label>
                  <select
                    value={issueForm.assignee}
                    onChange={e => setIssueForm({ ...issueForm, assignee: e.target.value })}
                    style={{ width: '100%', height: 40, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', padding: '0 8px' }}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.user.display_name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={issueForm.due_date}
                    onChange={e => setIssueForm({ ...issueForm, due_date: e.target.value })}
                    style={{ height: 40 }}
                  />
                </div>
              </div>

              <div className="row" style={{ gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={creatingIssue}>
                  {creatingIssue ? 'Creating...' : 'Create Issue'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateIssue(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED ISSUE MODAL (READ/EDIT/COMMENT) */}
      {selectedIssue && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', padding: 24, textAlign: 'left' }}>
            <div className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{selectedIssue.issue_key}</span>
                <h3 style={{ margin: '4px 0 0', color: 'var(--text-h)' }}>{selectedIssue.title}</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedIssue(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              {/* Left Column: Details + Comments */}
              <div className="stack" style={{ gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 13, color: 'var(--text-h)', margin: '0 0 6px' }}>Description</h4>
                  <p style={{ fontSize: 14, background: 'var(--code-bg)', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {selectedIssue.description || 'No description provided.'}
                  </p>
                </div>

                {/* Comment Section */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 14, color: 'var(--text-h)', marginBottom: 10 }}>Discussion</h4>
                  <div className="stack" style={{ gap: 8, maxHeight: 180, overflowY: 'auto', marginBottom: 12 }}>
                    {issueComments.map(c => (
                      <div key={c.id} style={{ background: 'var(--code-bg)', padding: 10, borderRadius: 6, fontSize: 13 }}>
                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                          <strong style={{ color: 'var(--text-h)' }}>{c.author.display_name}</strong>
                          <span className="faint" style={{ fontSize: 11 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ color: 'var(--text-h)' }}>{c.content}</div>
                      </div>
                    ))}
                    {issueComments.length === 0 && (
                      <p className="muted" style={{ fontSize: 13, textAlign: 'center', padding: 12 }}>No comments yet.</p>
                    )}
                  </div>

                  <form onSubmit={handleCommentSubmit} className="row" style={{ gap: 8 }}>
                    <input
                      placeholder="Add a comment..."
                      value={commentForm}
                      onChange={e => setCommentForm(e.target.value)}
                      style={{ flex: 1, height: 36 }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={commenting} style={{ height: 36, padding: '0 16px' }}>
                      {commenting ? '...' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Meta editors */}
              <div className="stack" style={{ gap: 12, borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
                <div className="field">
                  <label style={{ fontSize: 12 }}>Status</label>
                  <select
                    value={selectedIssue.status}
                    onChange={e => handleUpdateIssueField('status', e.target.value)}
                    style={{ width: '100%', height: 32, fontSize: 13 }}
                  >
                    {STATUS_COLUMNS.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label style={{ fontSize: 12 }}>Priority</label>
                  <select
                    value={selectedIssue.priority}
                    onChange={e => handleUpdateIssueField('priority', e.target.value)}
                    style={{ width: '100%', height: 32, fontSize: 13 }}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label style={{ fontSize: 12 }}>Assignee</label>
                  <select
                    value={selectedIssue.assignee || ''}
                    onChange={e => handleUpdateIssueField('assignee', e.target.value || null)}
                    style={{ width: '100%', height: 32, fontSize: 13 }}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.user.display_name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label style={{ fontSize: 12 }}>Due Date</label>
                  <input
                    type="date"
                    value={selectedIssue.due_date || ''}
                    onChange={e => handleUpdateIssueField('due_date', e.target.value || null)}
                    style={{ width: '100%', height: 32, fontSize: 13 }}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                  <button className="btn btn-ghost" style={{ width: '100%', color: '#ef4444', textAlign: 'center', fontSize: 13 }} onClick={() => handleDeleteIssue(selectedIssue.id)}>
                    Delete Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
