import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import RoleBadge from '../components/RoleBadge';
import { workspacesApi } from '../lib/endpoints';
import { extractApiError } from '../lib/api';

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const data = await workspacesApi.list();
      setWorkspaces(data);
    } catch (err) {
      setError(extractApiError(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await workspacesApi.create(form);
      setForm({ name: '', description: '' });
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Layout>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1>Workspaces</h1>
          <p className="muted" style={{ marginTop: 6 }}>Teams and projects you're part of.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : 'New workspace'}
        </button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {showCreate && (
        <form onSubmit={handleCreate} className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="ws-name">Workspace name</label>
              <input
                id="ws-name"
                required
                placeholder="Product Engineering"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="ws-desc">Description (optional)</label>
              <input
                id="ws-desc"
                placeholder="What is this workspace for?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ alignSelf: 'flex-start' }}>
              {creating ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>
      )}

      {workspaces === null && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="skeleton" style={{ height: 88 }} />
          <div className="skeleton" style={{ height: 88 }} />
        </div>
      )}

      {workspaces?.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <h3>Start your first workspace</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            A workspace holds your team, your projects, and everyone's roles in one place.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
            Create workspace
          </button>
        </div>
      )}

      <div className="stack" style={{ gap: 12 }}>
        {workspaces?.map((ws) => (
          <Link key={ws.id} to={`/workspaces/${ws.id}`} className="card workspace-row">
            <div className="row" style={{ justifyContent: 'space-between', padding: '20px 24px' }}>
              <div>
                <div className="row" style={{ gap: 10 }}>
                  <h3>{ws.name}</h3>
                  <RoleBadge role={ws.my_role} />
                </div>
                <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
                  {ws.description || 'No description yet.'}
                </p>
              </div>
              <div className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
                <span className="mono" style={{ fontSize: 13 }}>{ws.member_count} member{ws.member_count === 1 ? '' : 's'}</span>
                <span className="faint" style={{ fontSize: 12 }}>/{ws.slug}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
