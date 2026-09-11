/**
 * test_statewise_complaints.js
 * Verification of all 19 requirements in PART 12
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/complaints.json');
const complaintsRaw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING 19-POINT VERIFICATION SUITE ===\n');

  // 1. Authority Dashboard API endpoints load
  console.log('1. Checking Authority overview endpoint...');
  const ovRes = await fetch(`${BASE_URL}/api/authority/overview`);
  assert.strictEqual(ovRes.status, 200, 'Overview endpoint must return 200');
  const ovData = await ovRes.json();
  assert(ovData.success, 'Overview must return success: true');
  console.log('✓ Authority overview loads successfully');

  // 2. Complaints by State section endpoint loads
  console.log('2. Checking Complaints by State endpoint...');
  const stRes = await fetch(`${BASE_URL}/api/authority/complaints/by-state`);
  assert.strictEqual(stRes.status, 200, 'By-state endpoint must return 200');
  const stData = await stRes.json();
  assert(stData.success, 'By-state must return success: true');
  console.log('✓ Complaints by State endpoint loads successfully');

  // 3. State counts match the database
  console.log('3. Verifying state counts against database records...');
  // Manual database count:
  const dbStateMap = {};
  complaintsRaw.forEach(c => {
    let st = c.state && typeof c.state === 'string' ? c.state.trim() : null;
    if (!st && c.location) {
      const loc = c.location.toLowerCase();
      if (loc.includes('assam')) st = 'Assam';
      if (loc.includes('delhi')) st = 'Delhi';
    }
    if (st) {
      dbStateMap[st] = (dbStateMap[st] || 0) + 1;
    }
  });

  stData.states.forEach(s => {
    const expected = dbStateMap[s.state];
    assert.strictEqual(s.complaintCount, expected, `Count for ${s.state} should be ${expected}`);
    console.log(`   - State: ${s.state} -> API: ${s.complaintCount}, DB: ${expected} (MATCH)`);
  });
  console.log('✓ State counts match the database exactly');

  // 4 & 5. District counts match the database
  console.log('4 & 5. Verifying district counts for Assam against database records...');
  const dtRes = await fetch(`${BASE_URL}/api/authority/complaints/by-district?state=Assam`);
  assert.strictEqual(dtRes.status, 200, 'By-district endpoint must return 200');
  const dtData = await dtRes.json();
  assert(dtData.success, 'By-district must return success: true');

  const dbAssamDistMap = {};
  complaintsRaw.filter(c => {
    const st = c.state || (c.location && c.location.toLowerCase().includes('assam') ? 'Assam' : null);
    return st === 'Assam';
  }).forEach(c => {
    const dt = c.district || 'Unspecified District';
    dbAssamDistMap[dt] = (dbAssamDistMap[dt] || 0) + 1;
  });

  dtData.districts.forEach(d => {
    const expected = dbAssamDistMap[d.district];
    assert.strictEqual(d.complaintCount, expected, `District ${d.district} count should be ${expected}`);
    console.log(`   - District: ${d.district} -> API: ${d.complaintCount}, DB: ${expected} (MATCH)`);
  });
  console.log('✓ District counts match the database exactly');

  // 6. Clicking a district shows actual complaints
  console.log('6. Verifying district dockets for Cachar...');
  const docRes = await fetch(`${BASE_URL}/api/authority/complaints/district-dockets?state=Assam&district=Cachar`);
  assert.strictEqual(docRes.status, 200, 'District-dockets must return 200');
  const docData = await docRes.json();
  assert(docData.success, 'District-dockets must return success: true');
  assert.strictEqual(docData.complaints.length, 3, 'Cachar should have 3 complaints');

  // 7, 8, 9, 10, 11: Real fields verification
  console.log('7-11. Verifying Complaint ID, Location, Assigned Inspector, Status, Date are real database fields...');
  const sample = docData.complaints[0];
  const dbSample = complaintsRaw.find(c => c.id === sample.id);
  assert(dbSample, `Complaint ${sample.id} must exist in database`);
  
  assert.strictEqual(sample.id, dbSample.id, '7. Complaint ID must match real DB record');
  assert.strictEqual(sample.location, dbSample.location, '8. Location must match real DB record');
  assert.strictEqual(sample.district, dbSample.district, '8b. District must match real DB record');
  assert.strictEqual(sample.inspectorName, dbSample.inspectorName, '9. Assigned Inspector must match real DB record');
  assert.strictEqual(sample.status, dbSample.status, '10. Status must match real DB record');
  assert.strictEqual(sample.createdAt, dbSample.createdAt, '11. Date must match real DB record');
  console.log(`   - Verified record ${sample.id}:`);
  console.log(`     Location: ${sample.location}`);
  console.log(`     District: ${sample.district}`);
  console.log(`     Inspector: ${sample.inspectorName} (${sample.inspectorId})`);
  console.log(`     Status: ${sample.status}`);
  console.log(`     Date: ${sample.createdAt}`);
  console.log('✓ Real database data verified across all fields');

  // 12. Empty state works when there are no complaints
  console.log('12. Checking empty state for state without complaints (Goa)...');
  const emptyDtRes = await fetch(`${BASE_URL}/api/authority/complaints/by-district?state=Goa`);
  const emptyDtData = await emptyDtRes.json();
  assert.strictEqual(emptyDtData.totalDistricts, 0, 'Goa should have 0 districts');
  assert.strictEqual(emptyDtData.districts.length, 0, 'Goa districts list should be empty');
  console.log('✓ Empty state correctly returns 0 records');

  // 13. Authority geographic scope is enforced server-side
  console.log('13. Checking server-side Authority scope enforcement...');
  // Scope restricted to Delhi
  const scopeRes = await fetch(`${BASE_URL}/api/authority/complaints/by-state`, {
    headers: { 'x-authority-state': 'Delhi' }
  });
  const scopeData = await scopeRes.json();
  assert.strictEqual(scopeData.states.length, 1, 'Scoped authority must only receive 1 state');
  assert.strictEqual(scopeData.states[0].state, 'Delhi', 'Scoped authority must only receive Delhi');

  // Cross-scope unauthorized state request must be rejected with 403
  const crossScopeRes = await fetch(`${BASE_URL}/api/authority/complaints/by-district?state=Assam`, {
    headers: { 'x-authority-state': 'Delhi' }
  });
  assert.strictEqual(crossScopeRes.status, 403, 'Cross-scope request must return 403 Forbidden');
  console.log('✓ Authority geographic scope is strictly enforced on server');

  // 14. Existing Authority heatmap still works
  console.log('14. Checking existing Authority heatmap endpoint...');
  const geoRes = await fetch(`${BASE_URL}/api/authority/geo`);
  assert.strictEqual(geoRes.status, 200);
  const geoData = await geoRes.json();
  assert(geoData.success && Array.isArray(geoData.zones), 'Heatmap must return zones');
  console.log(`✓ Existing Authority heatmap returns ${geoData.zones.length} zones`);

  // 15. Existing Inspector search still works
  console.log('15. Checking existing Inspector directory search...');
  const inspSearchRes = await fetch(`${BASE_URL}/api/authority/inspectors?q=Boruah`);
  assert.strictEqual(inspSearchRes.status, 200);
  const inspSearchData = await inspSearchRes.json();
  assert(inspSearchData.inspectors.length >= 1, 'Should find Inspector Boruah');
  console.log(`✓ Existing Inspector search returned ${inspSearchData.inspectors.length} match(es)`);

  // 16. Existing Inspector Dashboard / complaints queue still works
  console.log('16. Checking complaints queue endpoint...');
  const compRes = await fetch(`${BASE_URL}/api/complaints`);
  assert.strictEqual(compRes.status, 200);
  const compData = await compRes.json();
  assert(compData.complaints.length >= 7, 'Should return complaints list');
  console.log(`✓ Existing complaints queue returned ${compData.complaints.length} records`);

  // 17 & 18. Citizen complaint location & nearest inspector routing service intact
  console.log('17 & 18. Checking nearest-inspector assignment service...');
  const { findNearestEligibleInspector } = require('../src/services/geoRoutingService');
  const routed = findNearestEligibleInspector({ latitude: 24.833, longitude: 92.779, state: 'Assam', pincode: '788001' });
  assert(routed && routed.inspectorId, 'Routing engine must assign eligible inspector');
  assert(routed.inspectorId === 'LM-063' || routed.inspectorId === 'LM-042', 'Must assign appropriate inspector');
  console.log(`✓ Nearest inspector routing intact: assigned ${routed.inspectorName} (${routed.inspectorId})`);

  // 19. All three demo logins still work
  console.log('19. Verifying all three demo logins in auth.js...');
  const authModule = require('../scratch/test_auth_flow.js'); // Already validated or test directly
  const { validateCredentials, ROLES } = (() => {
    const code = fs.readFileSync(path.join(__dirname, '../../Frontend/src/context/auth.js'), 'utf-8');
    const cjsCode = code.replace(/export const /g, 'const ').replace(/export function /g, 'function ');
    const fn = new Function('module', 'exports', 'sessionStorage', cjsCode + '\nreturn { validateCredentials, ROLES };');
    return fn({}, {}, {});
  })();

  const cUser = validateCredentials('citizen@labellens.com', 'Citizen@123', ROLES.CITIZEN);
  assert(cUser && cUser.role === ROLES.CITIZEN, 'Citizen demo login must work');

  const iUser = validateCredentials('inspector@labellens.gov.in', 'Inspector@123', ROLES.INSPECTOR);
  assert(iUser && iUser.role === ROLES.INSPECTOR, 'Inspector demo login must work');

  const aUser = validateCredentials('authority@labellens.gov.in', 'Authority@123', ROLES.AUTHORITY);
  assert(aUser && aUser.role === ROLES.AUTHORITY, 'Authority demo login must work');
  console.log('✓ All 3 demo logins verified: Citizen, Inspector, Authority');

  console.log('\n========================================');
  console.log('ALL 19 VERIFICATION CHECKS PASSED (100%)');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
