import { Navigate, useLocation } from 'react-router-dom';
import { getSession } from '../auth/session';

/**
 * ProtectedRoute — redirects to /login if no session exists.
 * Preserves the intended path in `state.from` for post-login redirect.
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
