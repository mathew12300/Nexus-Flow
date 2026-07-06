import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <div className="skeleton" style={{ width: 160, height: 24 }} />
      </div>
    );
  }

  return children;
}
