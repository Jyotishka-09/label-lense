import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * --------------
 * Wraps any element that requires authentication.
 *
 * Props:
 *   role     — Required role string: 'CITIZEN' | 'INSPECTOR' | 'AUTHORITY'
 *   children — The component(s) to render when access is granted
 *
 * Behaviour:
 *   - Not authenticated at all        → redirect to appropriate login page
 *   - Authenticated but wrong role    → redirect to appropriate login page
 *   - Authenticated with correct role → render children
 */

const LOGIN_ROUTES = {
  CITIZEN: '/citizen/login',
  INSPECTOR: '/official/login',
  AUTHORITY: '/official/login',
  COMPANY: '/official/login',
};

const ProtectedRoute = ({ role, children }) => {
  const { isAuthenticated, role: userRole } = useAuth();
  const location = useLocation();

  // Not logged in at all
  if (!isAuthenticated) {
    return (
      <Navigate
        to={LOGIN_ROUTES[role] ?? '/'}
        state={{ from: location, role }}
        replace
      />
    );
  }

  // Logged in but wrong role
  if (userRole !== role) {
    return (
      <Navigate
        to={LOGIN_ROUTES[role] ?? '/'}
        state={{ from: location, role }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
