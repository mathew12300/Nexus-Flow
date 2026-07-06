import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractApiError } from '../lib/api';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/workspaces', { replace: true });
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout eyebrow="Get started" title="Create your account" subtitle="Set up your first workspace in under a minute.">
      <form className="stack" style={{ gap: 16 }} onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            required
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: '100%', paddingRight: '46px' }}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--accent)',
                padding: '4px'
              }}
            >
              {showPass ? 'HIDE' : 'SHOW'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 8 }}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="muted" style={{ fontSize: 14, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
