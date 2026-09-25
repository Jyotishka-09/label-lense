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
  COMPANY: 'COMPANY',
};

// ---------------------------------------------------------------------------
// Official credentials registry (Legal Metrology Department Master Records)
// ---------------------------------------------------------------------------
export const REGISTERED_INSPECTORS = [
  {
    email: 'p.boruah.lm@assam.gov.in',
    aliasEmail: 'inspector@labellens.gov.in',
    password: 'Inspector@123',
    altPassword: 'inspector123',
    role: ROLES.INSPECTOR,
    name: 'Pranab Boruah',
    displayName: 'Pranab Boruah (Senior Inspector)',
    id: 'LM-042',
    code: 'INS-042',
    division: 'Guwahati Metropolitan Zone',
    jurisdiction: ['781001', '781003', '781005', '781022', '781024', '781028'],
    officerRole: 'Senior Legal Metrology Inspector',
  },
  {
    email: 's.sharma.lm@assam.gov.in',
    password: 'Inspector@123',
    altPassword: 'inspector123',
    role: ROLES.INSPECTOR,
    name: 'Siddharth Sharma',
    displayName: 'S. Sharma (Inspector)',
    id: 'LM-028',
    code: 'INS-028',
    division: 'Central Assam Zone',
    jurisdiction: ['782001', '784001'],
    officerRole: 'Legal Metrology Inspector (Grade-I)',
  },
  {
    email: 'p.kalita.lm@assam.gov.in',
    password: 'Inspector@123',
    altPassword: 'inspector123',
    role: ROLES.INSPECTOR,
    name: 'Partha Kalita',
    displayName: 'P. Kalita (Inspector)',
    id: 'LM-015',
    code: 'INS-015',
    division: 'Upper Assam Zone',
    jurisdiction: ['786001', '786125', '785001'],
    officerRole: 'Field Enforcement Officer',
  },
  {
    email: 'm.rahman.lm@assam.gov.in',
    password: 'Inspector@123',
    altPassword: 'inspector123',
    role: ROLES.INSPECTOR,
    name: 'Mujibur Rahman',
    displayName: 'M. Rahman (Inspector)',
    id: 'LM-051',
    code: 'INS-051',
    division: 'Lower Assam Zone',
    jurisdiction: ['783380', '783301'],
    officerRole: 'Assistant Legal Metrology Inspector',
  },
  {
    email: 'd.das.lm@assam.gov.in',
    password: 'Inspector@123',
    altPassword: 'inspector123',
    role: ROLES.INSPECTOR,
    name: 'Dipankar Das',
    displayName: 'D. Das (Inspector)',
    id: 'LM-063',
    code: 'INS-063',
    division: 'Barak Valley Zone',
    jurisdiction: ['788001', '788005', '788710'],
    officerRole: 'Legal Metrology Inspector',
  },
];

const CITIZEN_CREDENTIALS = [
  {
    email: 'citizen@labellens.com',
    aliasEmail: 'citizen',
    password: 'Citizen@123',
    altPassword: 'citizen123',
    role: ROLES.CITIZEN,
    name: 'Priya Sharma',
    id: 'CIT-001',
  },
];

const AUTHORITY_CREDENTIALS = [
  {
    email: 'authority@labellens.gov.in',
    aliasEmail: 'authority',
    password: 'Authority@123',
    altPassword: 'authority123',
    role: ROLES.AUTHORITY,
    name: 'R. Verma',
    id: 'AUTH-001',
    division: 'Legal Metrology Directorate — State Enforcement HQ',
    officerRole: 'Deputy Director, Legal Metrology',
  },
];

export const COMPANY_CREDENTIALS = [
  {
    email: 'company@labellens.com',
    aliasEmail: 'company',
    password: 'Company@123',
    altPassword: 'company123',
    role: ROLES.COMPANY,
    name: 'Patanjali Ayurved Ltd.',
    displayName: 'Patanjali Ayurved Ltd. (Quality & Regulatory Compliance)',
    id: 'CMP-001',
    code: 'BRAND-001',
    division: 'FMCG Packaged Goods & Regulatory Affairs',
    category: 'Packaged Food & Commodities',
  },
];

// ---------------------------------------------------------------------------
// Helper: case-flexible password matching
// ---------------------------------------------------------------------------
function matchesPassword(expected, alt, entered) {
  if (!entered) return false;
  const t = entered.trim();
  if (expected && (t === expected || t.toLowerCase() === expected.toLowerCase())) {
    return true;
  }
  if (alt && (t === alt || t.toLowerCase() === alt.toLowerCase())) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Validator — returns user object on success, null on failure
// ---------------------------------------------------------------------------
export function validateCredentials(identifier, password, expectedRole) {
  if (!identifier || !password) return null;
  const trimmedId = identifier.trim().toLowerCase();
  const trimmedPass = password.trim();

  // Helper for matching inspector
  const matchInspector = () => {
    return REGISTERED_INSPECTORS.find(
      (ins) =>
        (ins.email.toLowerCase() === trimmedId ||
          ins.aliasEmail?.toLowerCase() === trimmedId ||
          ins.id.toLowerCase() === trimmedId ||
          ins.code.toLowerCase() === trimmedId ||
          (trimmedId === 'inspector' && ins.id === 'LM-042')) &&
        matchesPassword(ins.password, ins.altPassword, trimmedPass)
    ) || null;
  };

  // Helper for matching authority
  const matchAuthority = () => {
    return AUTHORITY_CREDENTIALS.find(
      (a) =>
        (a.email.toLowerCase() === trimmedId ||
          a.aliasEmail?.toLowerCase() === trimmedId ||
          a.id.toLowerCase() === trimmedId ||
          trimmedId === 'authority' ||
          trimmedId === 'director') &&
        matchesPassword(a.password, a.altPassword, trimmedPass)
    ) || null;
  };

  // Helper for matching citizen
  const matchCitizen = () => {
    const known = CITIZEN_CREDENTIALS.find(
      (c) =>
        (c.email.toLowerCase() === trimmedId ||
          c.aliasEmail?.toLowerCase() === trimmedId ||
          c.id.toLowerCase() === trimmedId ||
          trimmedId === 'citizen') &&
        matchesPassword(c.password, c.altPassword, trimmedPass)
    );
    if (known) return known;

    // Allow testing with any valid email and 4+ character password
    if (trimmedId.includes('@') && trimmedPass.length >= 4) {
      const namePart = trimmedId.split('@')[0];
      const formattedName = namePart
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return {
        email: trimmedId,
        password: trimmedPass,
        role: ROLES.CITIZEN,
        name: formattedName || 'Citizen User',
        id: `CIT-${Math.floor(100 + Math.random() * 900)}`,
      };
    }

    return null;
  };

  // Helper for matching company
  const matchCompany = () => {
    return COMPANY_CREDENTIALS.find(
      (c) =>
        (c.email.toLowerCase() === trimmedId ||
          c.aliasEmail?.toLowerCase() === trimmedId ||
          c.id.toLowerCase() === trimmedId ||
          c.code?.toLowerCase() === trimmedId ||
          trimmedId === 'company' ||
          trimmedId === 'brand') &&
        matchesPassword(c.password, c.altPassword, trimmedPass)
    ) || null;
  };

  if (expectedRole === ROLES.INSPECTOR) {
    return matchInspector();
  }

  if (expectedRole === ROLES.AUTHORITY) {
    return matchAuthority();
  }

  if (expectedRole === ROLES.COMPANY) {
    return matchCompany();
  }

  if (expectedRole === ROLES.CITIZEN) {
    return matchCitizen();
  }

  // If role is unspecified, check all roles
  return matchInspector() || matchAuthority() || matchCompany() || matchCitizen();
}

// ---------------------------------------------------------------------------
// Session persistence helpers
// ---------------------------------------------------------------------------
export const SESSION_KEY = 'label_lens_auth_user';

export function saveSession(user) {
  if (!user) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('[Auth] Failed to save session:', err);
  }
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('[Auth] Failed to load session:', err);
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);

    // Also clear the legacy officer keys so old code doesn't break
    sessionStorage.removeItem('officer_authenticated');
    sessionStorage.removeItem('officer_id');
    sessionStorage.removeItem('officer_name');
    sessionStorage.removeItem('officer_role');
    sessionStorage.removeItem('officer_division');
  } catch (err) {
    console.error('[Auth] Failed to clear session:', err);
  }
}
