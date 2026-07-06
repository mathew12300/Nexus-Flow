import './auth-layout.css';

export default function AuthLayout({ children, eyebrow, title, subtitle }) {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-panel-mark" aria-hidden="true" />
        <h1 className="auth-panel-title">NexusFlow</h1>
        <p className="auth-panel-copy">
          One workspace for how your team actually gets work done — assignments,
          progress, and decisions, without switching tools to see the full picture.
        </p>
        <div className="auth-panel-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-box">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {subtitle && <p className="muted" style={{ marginTop: 6 }}>{subtitle}</p>}
          <div style={{ marginTop: 28 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
