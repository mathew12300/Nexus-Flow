const ROLE_STYLES = {
  owner: { bg: 'var(--surface-inverted)', text: 'var(--ink-on-inverted)' },
  admin: { bg: 'var(--stall-soft)', text: 'var(--stall-text-on-soft)' },
  member: { bg: 'var(--flow-soft)', text: 'var(--flow-text-on-soft)' },
  viewer: { bg: 'var(--surface-sunken)', text: 'var(--ink-muted)' },
};

export default function RoleBadge({ role }) {
  const style = ROLE_STYLES[role] || ROLE_STYLES.viewer;
  return (
    <span className="badge" style={{ background: style.bg, color: style.text }}>
      {role}
    </span>
  );
}

export function roleColor(role) {
  return {
    owner: '#12141C',
    admin: '#C4821F',
    member: '#4C4FE0',
    viewer: '#8890A3',
  }[role] || '#8890A3';
}
