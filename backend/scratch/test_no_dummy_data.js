/**
 * scratch/test_no_dummy_data.js
 * ------------------------------
 * Automated test suite verifying that Inspector and Authority dashboards
 * consume strictly REAL data from the backend database with zero mock fallbacks.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const DB_PATH = path.join(__dirname, '../data/complaints.json');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING ZERO DUMMY/MOCK DATA ON INSPECTOR & AUTHORITY');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  // Load database records for comparison
  const rawDb = fs.readFileSync(DB_PATH, 'utf-8');
  const dbRecords = JSON.parse(rawDb);
  console.log(`[Database] complaints.json contains ${dbRecords.length} genuine records.\n`);

  // ── TEST 1: Authority Overview Real Counts ─────────────────────────────────
  console.log('--- TEST 1: /api/authority/overview Real Telemetry ---');
  try {
    const res = await axios.get(`${BASE_URL}/api/authority/overview`);
    assert(res.status === 200, 'Endpoint returns 200 OK');
    const t = res.data.telemetry;

    const expectedTotal = dbRecords.length;
    const expectedPending = dbRecords.filter(c => c.status === 'SUBMITTED' || c.status === 'PENDING').length;
    const expectedActive = dbRecords.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'INSPECTION_IN_PROGRESS').length;
    const expectedCompleted = dbRecords.filter(c => (c.status || '').toUpperCase().includes('COMPLETED')).length;

    assert(t.total === expectedTotal, `Total (${t.total}) matches database records (${expectedTotal})`);
    assert(t.pending === expectedPending, `Pending (${t.pending}) matches database pending (${expectedPending})`);
    assert(t.underInspection === expectedActive, `Under Inspection (${t.underInspection}) matches database active (${expectedActive})`);
    assert(t.completed === expectedCompleted, `Completed (${t.completed}) matches database completed (${expectedCompleted})`);
    assert(t.operationalQueue === expectedPending + expectedActive, `Operational Queue (${t.operationalQueue}) is exactly pending + active`);
  } catch (err) {
    assert(false, `Test 1 request failed: ${err.message}`);
  }

  // ── TEST 2: Authority Geographic Heatmap Real Counts ───────────────────────
  console.log('\n--- TEST 2: /api/authority/geo Real Geographic Hotspots ---');
  try {
    const res = await axios.get(`${BASE_URL}/api/authority/geo`);
    assert(res.status === 200, 'Endpoint returns 200 OK');
    const zones = res.data.zones;
    assert(Array.isArray(zones) && zones.length > 0, `Returns ${zones.length} administrative enforcement zones`);

    // Sum of dockets across all zones
    const sumZoneDockets = zones.reduce((s, z) => s + z.total, 0);
    console.log(`  [Geo Telemetry] Total zone-mapped dockets: ${sumZoneDockets}`);

    // Verify each zone's violation count matches database
    for (const zone of zones) {
      const zoneViolations = dbRecords.filter(c => {
        const pinMatch = zone.pincodes.some(p => p.pincode === String(c.pincode || '').trim());
        const locMatch = (c.location || '').toLowerCase().includes(zone.district.toLowerCase());
        const isViolation = c.officerDecision === 'NON_COMPLIANT' || c.inspectionResult === 'NON_COMPLIANT';
        return (pinMatch || locMatch) && isViolation;
      }).length;
      assert(zone.violations === zoneViolations, `Zone ${zone.zoneName} violations (${zone.violations}) matches DB violations (${zoneViolations})`);
    }
  } catch (err) {
    assert(false, `Test 2 request failed: ${err.message}`);
  }

  // ── TEST 3: Inspector Directory & Real Workload ────────────────────────────
  console.log('\n--- TEST 3: /api/authority/inspectors Real Workload & Registry ---');
  try {
    const res = await axios.get(`${BASE_URL}/api/authority/inspectors`);
    assert(res.status === 200, 'Endpoint returns 200 OK');
    const inspectors = res.data.inspectors;
    assert(Array.isArray(inspectors) && inspectors.length >= 5, `Returns ${inspectors.length} registered inspectors`);

    // Verify Inspector Boruah LM-042
    const boruah = inspectors.find(i => i.id === 'LM-042');
    assert(boruah && boruah.fullName === 'Pranab Boruah', 'LM-042 is Pranab Boruah (Guwahati Metropolitan Zone)');
    assert(boruah.division === 'Guwahati Metropolitan Zone', 'LM-042 assigned to Guwahati Metropolitan Zone');

    // Verify Inspector Siddharth Sharma LM-028
    const sharma = inspectors.find(i => i.id === 'LM-028');
    assert(sharma && sharma.fullName === 'Siddharth Sharma', 'LM-028 is Siddharth Sharma (Central Assam Zone)');

    // Verify Dipankar Das LM-063
    const das = inspectors.find(i => i.id === 'LM-063');
    assert(das && das.fullName === 'Dipankar Das', 'LM-063 is Dipankar Das (Barak Valley Zone)');

    // Verify that assigned tasks are real records from complaints.json
    for (const ins of inspectors) {
      for (const t of ins.recentTasks) {
        const existsInDb = dbRecords.some(c => c.id === t.id);
        assert(existsInDb, `Inspector ${ins.id} task ${t.id} actually exists in database`);
      }
    }
  } catch (err) {
    assert(false, `Test 3 request failed: ${err.message}`);
  }

  // ── TEST 4: Inspector Search Real Behavior & Empty States ──────────────────
  console.log('\n--- TEST 4: Inspector Search Real Match & Empty State ---');
  try {
    // Search existing inspector
    const resFound = await axios.get(`${BASE_URL}/api/authority/inspectors?q=Boruah`);
    assert(resFound.data.total === 1, 'Search for "Boruah" returns exactly 1 inspector');
    assert(resFound.data.inspectors[0].id === 'LM-042', 'Found inspector ID is LM-042');

    // Search non-existent inspector
    const resNotFound = await axios.get(`${BASE_URL}/api/authority/inspectors?q=NonExistentOfficer999`);
    assert(resNotFound.data.total === 0, 'Search for non-existent officer returns 0 results (triggers "No inspector found.")');
    assert(resNotFound.data.inspectors.length === 0, 'Inspectors array is empty');
  } catch (err) {
    assert(false, `Test 4 request failed: ${err.message}`);
  }

  // ── TEST 5: Commodity Risk Matrix Real Data ────────────────────────────────
  console.log('\n--- TEST 5: /api/authority/risk Real Risk Aggregation ---');
  try {
    const res = await axios.get(`${BASE_URL}/api/authority/risk`);
    assert(res.status === 200, 'Endpoint returns 200 OK');
    assert(res.data.totalRecordsEvaluated === dbRecords.length, `Evaluated records (${res.data.totalRecordsEvaluated}) equals DB count (${dbRecords.length})`);
    assert(Array.isArray(res.data.categoryRisk), 'Category risk is an array');
    assert(Array.isArray(res.data.violationTypologies), 'Violation typologies is an array');
  } catch (err) {
    assert(false, `Test 5 request failed: ${err.message}`);
  }

  // ── TEST 6: Inspector Queue Filtering on Real Complaints ───────────────────
  console.log('\n--- TEST 6: /api/complaints Filtering by Inspector ID ---');
  try {
    const resAll = await axios.get(`${BASE_URL}/api/complaints`);
    assert(resAll.data.complaints.length === dbRecords.length, `All complaints count (${resAll.data.complaints.length}) equals DB count (${dbRecords.length})`);

    // Inspector Dipankar Das (LM-063) queue
    const resDas = await axios.get(`${BASE_URL}/api/complaints?inspectorId=LM-063`);
    const expectedDasCount = dbRecords.filter(c => c.inspectorId === 'LM-063').length;
    assert(resDas.data.complaints.length === expectedDasCount, `LM-063 queue count (${resDas.data.complaints.length}) matches DB (${expectedDasCount})`);

    // Verify all returned complaints belong to LM-063
    for (const c of resDas.data.complaints) {
      assert(c.inspectorId === 'LM-063', `Complaint ${c.id} has inspectorId LM-063`);
    }
  } catch (err) {
    assert(false, `Test 6 request failed: ${err.message}`);
  }

  // ── TEST 7: Integrity of Genuine Database Records ──────────────────────────
  console.log('\n--- TEST 7: Database Records Preserved ---');
  const preservedIds = ['LL-2026-0001', 'LL-2026-0002', 'LL-2026-0003', 'LL-2026-0004', 'LL-2026-0005', 'LL-2026-0006'];
  for (const id of preservedIds) {
    const exists = dbRecords.some(c => c.id === id);
    assert(exists, `Genuine record ${id} is preserved in complaints.json`);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
