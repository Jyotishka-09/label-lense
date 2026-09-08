/**
 * auth.js
 * -------
 * Prototype-only dummy credential store.
 * Replace this module with real API calls when moving to production.
 *
 * DO NOT store real credentials here.
 */

export const ROLES = {
  CITIZEN: 'CITIZEN',
  INSPECTOR: 'INSPECTOR',
  AUTHORITY: 'AUTHORITY',
};

// ---------------------------------------------------------------------------
// Dummy credentials (prototype only)
// ---------------------------------------------------------------------------
const DUMMY_CREDENTIALS = [
  {
    email: 'citizen@labellens.com',
    password: 'Citizen@123',
    role: ROLES.CITIZEN,
    name: 'Priya Sharma',
    id: 'CIT-001',
  },
  {
    email: 'inspector@labellens.gov.in',
    password: 'Inspector@123',
    role: ROLES.INSPECTOR,
    name: 'S. Sharma',
    id: 'LM-042',
    division: 'Guwahati & North-East Enforcement Division',
    officerRole: 'Legal Metrology Inspector',
  },
  {
    email: 'authority@labellens.gov.in',
    password: 'Authority@123',
    role: ROLES.AUTHORITY,
    name: 'R. Verma',
    id: 'AUTH-001',
    division: 'Legal Metrology Directorate — National HQ',
    officerRole: 'Deputy Director, Legal Metrology',
  },
];

// ---------------------------------------------------------------------------
// Session storage keys
// ---------------------------------------------------------------------------
export const SESSION_KEY = 'labellens_auth';

// ---------------------------------------------------------------------------
// Validator — returns user object on success, null on failure
// ---------------------------------------------------------------------------
export function validateCredentials(email, password, expectedRole) {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPass = password.trim();

  const user = DUMMY_CREDENTIALS.find(
    (c) =>
      c.email.toLowerCase() === trimmedEmail &&
      c.password === trimmedPass &&
      c.role === expectedRole
  );

  return user || null;
}

// ---------------------------------------------------------------------------
// Session persistence helpers
// ---------------------------------------------------------------------------
export function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);

  // Also clear the legacy officer keys so old code doesn't break
  sessionStorage.removeItem('officer_authenticated');
  sessionStorage.removeItem('officer_id');
  sessionStorage.removeItem('officer_name');
  sessionStorage.removeItem('officer_role');
  sessionStorage.removeItem('officer_division');
}
