import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // While we check if there's a stored session, show a centered spinner
  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: '100vh' }}>
        <span className="spinner" aria-label="Checking session…" />
      </div>
    );
  }

  // No user = send them to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated — render whatever is inside this route
  return <Outlet />;
};
