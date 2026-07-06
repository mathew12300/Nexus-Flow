import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }

  const isWorkspacesActive = location.pathname.startsWith('/workspaces') || location.pathname === '/';
  const isSettingsActive = location.pathname === '/settings';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const filteredItems = useMemo(() => {
    return [
      { id: 'theme', name: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, shortcut: 'T', action: () => toggleTheme() },
      { id: 'go-board', name: 'Go to Kanban Board', shortcut: 'G B', action: () => window.dispatchEvent(new CustomEvent('change-tab', { detail: 'board' })) },
      { id: 'go-projects', name: 'Go to Projects List', shortcut: 'G P', action: () => window.dispatchEvent(new CustomEvent('change-tab', { detail: 'projects' })) },
      { id: 'go-issues', name: 'Go to Issues List', shortcut: 'G I', action: () => window.dispatchEvent(new CustomEvent('change-tab', { detail: 'issues' })) },
      { id: 'go-members', name: 'Go to Members List', shortcut: 'G M', action: () => window.dispatchEvent(new CustomEvent('change-tab', { detail: 'members' })) },
      { id: 'go-settings', name: 'Go to Account Settings', shortcut: 'G S', action: () => navigate('/settings') },
      { id: 'go-workspaces', name: 'Go to Workspaces list', shortcut: 'G W', action: () => navigate('/workspaces') }
    ].filter(item => item.name.toLowerCase().includes(paletteSearch.toLowerCase()));
  }, [theme, navigate, paletteSearch]);

  useEffect(() => {
    let lastKey = null;
    let lastKeyTime = 0;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

      if (e.key === 'Escape') {
        if (paletteOpen) {
          setPaletteOpen(false);
          e.preventDefault();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
        setPaletteSearch('');
        setSelectedIndex(0);
        return;
      }

      if (paletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredItems.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            setPaletteOpen(false);
          }
          return;
        }
        return; // swallow other shortcuts if palette is open
      }

      if (isInput) return;

      const now = Date.now();
      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        if (key === 'b') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('change-tab', { detail: 'board' }));
        } else if (key === 'p') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('change-tab', { detail: 'projects' }));
        } else if (key === 'i') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('change-tab', { detail: 'issues' }));
        } else if (key === 'm') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('change-tab', { detail: 'members' }));
        } else if (key === 's') {
          e.preventDefault();
          navigate('/settings');
        }
        lastKey = null;
        return;
      }

      if (key === 'g') {
        lastKey = 'g';
        lastKeyTime = now;
        return;
      }

      if (key === 'c') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('trigger-create-issue'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paletteOpen, filteredItems, selectedIndex, navigate]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/workspaces" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          NexusFlow
        </Link>

        <nav className="sidebar-nav">
          <Link to="/workspaces" className={`sidebar-link ${isWorkspacesActive ? 'sidebar-link-active' : ''}`}>
            Workspaces
          </Link>
          <Link to="/settings" className={`sidebar-link ${isSettingsActive ? 'sidebar-link-active' : ''}`}>
            Account Settings
          </Link>
          <button
            onClick={toggleTheme}
            className="sidebar-link theme-toggle-btn"
            style={{
              background: 'none',
              border: 'none',
              textAlign: 'left',
              width: '100%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{(user?.display_name || 'Guest').slice(0, 1).toUpperCase()}</div>
            <div className="stack" style={{ minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user ? user.display_name : 'Guest User'}
              </span>
              <span className="faint" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user ? user.email : 'Local playground'}
              </span>
            </div>
          </div>
          {user && user.id !== 'guest-user-id' ? (
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm" style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
              Sign in
            </Link>
          )}
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="app-header">
          <div className="search-bar-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search issues, projects... (Type to filter, Ctrl+K for commands)"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                window.dispatchEvent(new CustomEvent('global-search', { detail: e.target.value }));
              }}
              className="header-search-input"
            />
          </div>
          <div className="header-actions">
            <kbd className="cmd-k-hint">Ctrl + K</kbd>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>

      {/* Command Palette Modal */}
      {paletteOpen && (
        <div className="palette-overlay" onClick={() => setPaletteOpen(false)}>
          <div className="palette-modal" onClick={e => e.stopPropagation()}>
            <div className="palette-search">
              <span className="palette-icon">⚡</span>
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search actions..."
                value={paletteSearch}
                onChange={e => {
                  setPaletteSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                className="palette-input"
              />
            </div>
            <div className="palette-list">
              {filteredItems.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`palette-item ${idx === selectedIndex ? 'palette-item-selected' : ''}`}
                >
                  <span className="palette-item-name">{item.name}</span>
                  {item.shortcut && <kbd className="palette-item-shortcut">{item.shortcut}</kbd>}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="palette-empty">No commands match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
