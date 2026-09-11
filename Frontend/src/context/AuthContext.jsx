import React, { createContext, useContext, useState, useCallback } from 'react';
import { saveSession, loadSession, clearSession } from './auth';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------
export const AuthProvider = ({ children }) => {
  // Initialise from sessionStorage so a page refresh keeps the user logged in
  const [user, setUser] = useState(() => loadSession());

  const isAuthenticated = !!user;
  const role = user?.role ?? null;

  /** Call this after validateCredentials() succeeds */
  const login = useCallback((userData) => {
    saveSession(userData);

    // Mirror legacy officer keys so existing InspectorDashboard/OfficialNavbar
    // (which read sessionStorage directly) continue to work without modification
    if (userData.role === 'INSPECTOR') {
      sessionStorage.setItem('officer_authenticated', 'true');
      sessionStorage.setItem('officer_id', userData.id);
      sessionStorage.setItem('officer_name', userData.name + ' (Inspector)');
      sessionStorage.setItem('officer_role', userData.officerRole || 'Legal Metrology Inspector');
      sessionStorage.setItem('officer_division', userData.division || '');
    } else if (userData.role === 'AUTHORITY') {
      sessionStorage.setItem('officer_authenticated', 'true');
      sessionStorage.setItem('officer_id', userData.id || 'AUTH-001');
      sessionStorage.setItem('officer_name', userData.name ? `${userData.name} (Authority)` : 'Authority Officer');
      sessionStorage.setItem('officer_role', userData.officerRole || 'Supervisory Authority');
      sessionStorage.setItem('officer_division', userData.division || 'State Enforcement Directorate');
    }

    setUser(userData);
  }, []);

  /** Clears all session data and resets state */
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
};

export default AuthContext;
