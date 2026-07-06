import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/endpoints';
import { extractApiError } from '../lib/api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ full_name: '', display_name: '' });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Sync state with current user
  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        display_name: user.display_name || ''
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSubmitting(true);
    try {
      const updatedUser = await authApi.updateMe(profileForm);
      setUser(updatedUser);
      setProfileSuccess('Profile details updated successfully.');
    } catch (err) {
      setProfileError(extractApiError(err));
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPassError('New passwords do not match.');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPassError('Password must be at least 8 characters long.');
      return;
    }

    setPassSubmitting(true);
    try {
      const res = await authApi.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });
      setPassSuccess(res.detail || 'Password changed successfully.');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPassError(extractApiError(err));
    } finally {
      setPassSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom: 32 }}>
        <h1>Account Settings</h1>
        <p className="muted" style={{ marginTop: 6 }}>Manage your user profile details and security settings.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
        
        {/* Left Card: Profile Settings */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Profile Information</h2>
          
          {profileError && <div className="error-banner" style={{ marginBottom: 16 }}>{profileError}</div>}
          {profileSuccess && (
            <div className="notice-banner" style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: 6, fontSize: 14 }}>
              {profileSuccess}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="stack" style={{ gap: 16 }}>
            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                style={{ background: 'var(--code-bg)', cursor: 'not-allowed', color: 'var(--text)' }}
              />
              <span className="faint" style={{ fontSize: 11, marginTop: 4 }}>Primary email cannot be changed.</span>
            </div>

            <div className="field">
              <label htmlFor="full-name">Full Name</label>
              <input
                id="full-name"
                required
                placeholder="Ada Lovelace"
                value={profileForm.full_name}
                onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="display-name">Display Name (optional)</label>
              <input
                id="display-name"
                placeholder="Ada"
                value={profileForm.display_name}
                onChange={e => setProfileForm({ ...profileForm, display_name: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={profileSubmitting} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              {profileSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Right Card: Security & Password Update */}
        <div className="card" style={{ padding: 24 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Security Settings</h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--accent)', padding: '2px 8px', fontSize: 12 }}
              onClick={() => setShowPass(v => !v)}
            >
              {showPass ? 'HIDE PASSWORDS' : 'SHOW PASSWORDS'}
            </button>
          </div>

          {passError && <div className="error-banner" style={{ marginBottom: 16 }}>{passError}</div>}
          {passSuccess && (
            <div className="notice-banner" style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: 6, fontSize: 14 }}>
              {passSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="stack" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="old-pass">Current Password</label>
              <input
                id="old-pass"
                type={showPass ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={passwordForm.old_password}
                onChange={e => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="new-pass">New Password</label>
              <input
                id="new-pass"
                type={showPass ? 'text' : 'password'}
                required
                placeholder="At least 8 characters"
                value={passwordForm.new_password}
                onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="confirm-pass">Confirm New Password</label>
              <input
                id="confirm-pass"
                type={showPass ? 'text' : 'password'}
                required
                placeholder="Re-type new password"
                value={passwordForm.confirm_password}
                onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={passSubmitting} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              {passSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </Layout>
  );
}
