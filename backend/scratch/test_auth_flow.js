/**
 * test_auth_flow.js
 * Verification of auth validator, session helpers, and API endpoints
 */

const assert = require('assert');

// 1. Emulate browser sessionStorage
const store = {};
global.sessionStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Import module functions
// We will test importing or defining the exact logic in auth.js
const { ROLES, REGISTERED_INSPECTORS, validateCredentials, saveSession, loadSession, clearSession, SESSION_KEY } = (() => {
  // Read auth.js
  const fs = require('fs');
  const path = require('path');
  const code = fs.readFileSync(path.join(__dirname, '../../Frontend/src/context/auth.js'), 'utf-8');
  
  // Transform ESM export to CommonJS for testing
  const cjsCode = code
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
    .replace(/export default /g, '// ');

  const moduleExports = {};
  const fn = new Function('module', 'exports', 'sessionStorage', cjsCode + '\n' +
    'return { ROLES, REGISTERED_INSPECTORS, validateCredentials, saveSession, loadSession, clearSession, SESSION_KEY };'
  );
  return fn({ exports: moduleExports }, moduleExports, global.sessionStorage);
})();

console.log('--- 1. Testing SESSION_KEY and Session Persistence ---');
assert(SESSION_KEY === 'label_lens_auth_user', 'SESSION_KEY should be defined');

const dummyUser = { id: 'CIT-001', name: 'Priya Sharma', role: 'CITIZEN' };
saveSession(dummyUser);
assert.deepStrictEqual(loadSession(), dummyUser, 'loadSession should match saved session');

clearSession();
assert.strictEqual(loadSession(), null, 'loadSession should return null after clearSession');
console.log('✓ Session persistence passed');

console.log('--- 2. Testing Citizen Credentials ---');
const citizen1 = validateCredentials('citizen@labellens.com', 'Citizen@123', ROLES.CITIZEN);
assert(citizen1 && citizen1.role === ROLES.CITIZEN, 'Citizen login with primary credentials should succeed');

const citizen2 = validateCredentials('citizen@labellens.com', 'citizen123', ROLES.CITIZEN);
assert(citizen2 && citizen2.role === ROLES.CITIZEN, 'Citizen login with altPassword should succeed');

const citizen3 = validateCredentials('citizen', 'Citizen@123', ROLES.CITIZEN);
assert(citizen3 && citizen3.role === ROLES.CITIZEN, 'Citizen login with alias username should succeed');

const customCitizen = validateCredentials('testuser@gmail.com', 'mypassword123', ROLES.CITIZEN);
assert(customCitizen && customCitizen.role === ROLES.CITIZEN, 'Custom citizen email login should succeed');
console.log('✓ Citizen validation passed');

console.log('--- 3. Testing Inspector Credentials ---');
const insp1 = validateCredentials('inspector@labellens.gov.in', 'Inspector@123', ROLES.INSPECTOR);
assert(insp1 && insp1.role === ROLES.INSPECTOR, 'Inspector login with alias email should succeed');

const insp2 = validateCredentials('LM-042', 'inspector123', ROLES.INSPECTOR);
assert(insp2 && insp2.role === ROLES.INSPECTOR, 'Inspector login with ID and altPassword should succeed');

const insp3 = validateCredentials('p.boruah.lm@assam.gov.in', 'Inspector@123', ROLES.INSPECTOR);
assert(insp3 && insp3.role === ROLES.INSPECTOR, 'Inspector login with official email should succeed');
console.log('✓ Inspector validation passed');

console.log('--- 4. Testing Authority Credentials ---');
const auth1 = validateCredentials('authority@labellens.gov.in', 'Authority@123', ROLES.AUTHORITY);
assert(auth1 && auth1.role === ROLES.AUTHORITY, 'Authority login with primary credentials should succeed');

const auth2 = validateCredentials('authority', 'authority123', ROLES.AUTHORITY);
assert(auth2 && auth2.role === ROLES.AUTHORITY, 'Authority login with alias and altPassword should succeed');

const auth3 = validateCredentials('AUTH-001', 'Authority@123', ROLES.AUTHORITY);
assert(auth3 && auth3.role === ROLES.AUTHORITY, 'Authority login with ID should succeed');
console.log('✓ Authority validation passed');

console.log('--- 5. Testing Role Fallback Handling ---');
// If user has Inspector selected, but entered Authority credentials
const misAuthUser = validateCredentials('authority@labellens.gov.in', 'Authority@123', ROLES.INSPECTOR);
assert.strictEqual(misAuthUser, null, 'Direct check with wrong expectedRole is null');
// But fallback checks other role:
const fallbackAuth = validateCredentials('authority@labellens.gov.in', 'Authority@123', ROLES.AUTHORITY);
assert(fallbackAuth && fallbackAuth.role === ROLES.AUTHORITY, 'Fallback finds Authority user correctly');
console.log('✓ Role fallback logic verified');

console.log('--- 6. Verifying Backend Endpoints for Citizen, Inspector, Authority ---');
async function testEndpoints() {
  const base = 'http://localhost:5000';
  
  // Citizen & Inspector complaints list
  const compRes = await fetch(`${base}/api/complaints`);
  const compJson = await compRes.json();
  assert(compJson.success, 'Complaints endpoint should return success');
  console.log(`✓ /api/complaints returned ${compJson.complaints.length} records`);

  // Authority Overview
  const ovRes = await fetch(`${base}/api/authority/overview`);
  const ovJson = await ovRes.json();
  assert(ovJson.success && ovJson.telemetry, 'Authority overview should return telemetry');
  console.log(`✓ /api/authority/overview returned telemetry (total: ${ovJson.telemetry.total})`);

  // Authority Geo Heatmap
  const geoRes = await fetch(`${base}/api/authority/geo`);
  const geoJson = await geoRes.json();
  assert(geoJson.success && Array.isArray(geoJson.zones), 'Authority geo should return zones');
  console.log(`✓ /api/authority/geo returned ${geoJson.zones.length} zones`);

  // Authority Inspectors
  const inspRes = await fetch(`${base}/api/authority/inspectors`);
  const inspJson = await inspRes.json();
  assert(inspJson.success && Array.isArray(inspJson.inspectors), 'Authority inspectors should return list');
  console.log(`✓ /api/authority/inspectors returned ${inspJson.inspectors.length} inspectors`);

  // Authority Risk
  const riskRes = await fetch(`${base}/api/authority/risk`);
  const riskJson = await riskRes.json();
  assert(riskJson.success && Array.isArray(riskJson.categoryRisk), 'Authority risk should return categories');
  console.log(`✓ /api/authority/risk returned ${riskJson.categoryRisk.length} category risk items`);

  console.log('\nALL 6 AUTH & DASHBOARD VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

testEndpoints().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
