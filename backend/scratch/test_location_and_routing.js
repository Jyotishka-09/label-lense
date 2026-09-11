/**
 * test_location_and_routing.js
 * ----------------------------
 * Comprehensive test suite validating the complete 15-point verification plan:
 * - Citizen complaint location capture (GPS coordinates & manual administrative address)
 * - Strict backend validation (rejects empty/missing locations)
 * - Haversine distance and jurisdiction-first nearest eligible inspector routing
 * - Automatic assignment to real inspectors (LM-042 for Guwahati Metro, LM-028 for Central Assam, etc.)
 * - Scope boundaries & out-of-jurisdiction protection (no out-of-bounds cross-assignment)
 * - Pending assignment fallback ("Inspector Assignment Pending") for unassigned / out-of-state circles
 * - Inspector queue filtering by assigned officer ID
 * - Unified visibility in Authority Dashboard
 */

const http = require('http');
const assert = require('assert');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('RUNNING CITIZEN COMPLAINT LOCATION & NEAREST INSPECTOR TESTS');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function record(testName, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       -> ${details}`);
      failed++;
    }
  }

  // ── TEST 11: Validation — Missing/empty location should be rejected ────────
  console.log('--- TEST 11: Location Validation on Submission ---');
  const resMissingLoc = await request('POST', '/api/complaints', {
    productName: 'Biscuits Pack 200g',
    brand: 'Britannia',
    issueCategory: 'MRP / Price Discrepancy',
    // location missing
  });
  record(
    'TEST 11: Rejects complaint submission with missing location',
    resMissingLoc.status === 400 && resMissingLoc.body?.message?.includes('Please select the location'),
    `Status: ${resMissingLoc.status}, Message: "${resMissingLoc.body?.message}"`
  );

  const resPlaceholderLoc = await request('POST', '/api/complaints', {
    productName: 'Biscuits Pack 200g',
    brand: 'Britannia',
    location: 'Location not specified',
  });
  record(
    'TEST 11b: Rejects complaint submission with placeholder "Location not specified"',
    resPlaceholderLoc.status === 400,
    `Status: ${resPlaceholderLoc.status}`
  );

  // ── TEST 1-5: Create complaint at Fancy Bazaar, Guwahati (781001) ───────────
  console.log('\n--- TEST 1-5: Citizen Location Capture & Nearest Inspector Routing ---');
  const fancyBazaarPayload = {
    productName: 'Haldiram Bhujia 150g',
    brand: 'Haldiram',
    issueCategory: 'MRP / Price Discrepancy',
    citizenDescription: 'Sold at ₹45 instead of printed MRP ₹40',
    location: 'Fancy Bazaar, Guwahati, Kamrup Metropolitan, Assam (781001)',
    location_address: 'Fancy Bazaar Wholesale Market, Guwahati',
    locality: 'Fancy Bazaar',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    pincode: '781001',
    latitude: 26.184,
    longitude: 91.745,
  };

  const resGuwahati = await request('POST', '/api/complaints', fancyBazaarPayload);
  const compGuwahati = resGuwahati.body?.complaint;

  record(
    'TEST 3: Complaint saved with structured location coordinates',
    resGuwahati.status === 201 && compGuwahati?.id && compGuwahati?.latitude === 26.184,
    `Created ID: ${compGuwahati?.id}, Lat: ${compGuwahati?.latitude}, Pincode: ${compGuwahati?.pincode}`
  );

  record(
    'TEST 4 & 5: Nearest Inspector routing assigned LM-042 (Inspector Boruah)',
    compGuwahati?.inspectorId === 'LM-042' && compGuwahati?.assignmentStatus === 'ASSIGNED',
    `Assigned: ${compGuwahati?.inspectorName} (${compGuwahati?.inspectorId}), Reason: "${compGuwahati?.assignmentReason}"`
  );

  // ── TEST 6: Inspector Queue Filtering ─────────────────────────────────────
  console.log('\n--- TEST 6: Inspector Dashboard Queue Verification ---');
  const resInspectorQueue = await request('GET', `/api/complaints?inspectorId=LM-042`);
  const inspectorTasks = resInspectorQueue.body?.complaints || [];
  const foundInInspectorQueue = inspectorTasks.some(t => t.id === compGuwahati.id);

  record(
    'TEST 6: Assigned complaint appears in Inspector Boruah (LM-042) queue',
    foundInInspectorQueue,
    `Inspector LM-042 queue count: ${inspectorTasks.length}, Found Docket: ${compGuwahati?.id}`
  );

  // ── TEST 7-8: Authority Dashboard Visibility ──────────────────────────────
  console.log('\n--- TEST 7-8: Authority Dashboard Visibility ---');
  const resAuthorityOverview = await request('GET', '/api/authority/overview');
  const resComplaintsList = await request('GET', '/api/complaints');
  const allComplaints = resComplaintsList.body?.complaints || [];
  const docketInAuthority = allComplaints.find(c => c.id === compGuwahati.id);

  record(
    'TEST 7 & 8: Authority Dashboard sees Docket ID, Location, District, Inspector, Status',
    docketInAuthority && 
    docketInAuthority.inspectorId === 'LM-042' && 
    docketInAuthority.location && 
    docketInAuthority.district === 'Kamrup Metropolitan',
    `Docket: ${docketInAuthority?.id} | Loc: "${docketInAuthority?.location}" | Inspector: ${docketInAuthority?.inspectorId} | Status: ${docketInAuthority?.status}`
  );

  // ── TEST 9: Complaint in Central Assam (Tezpur 784001) ──────────────────────
  console.log('\n--- TEST 9: Multi-Zone Routing to Central Assam (LM-028) ---');
  const tezpurPayload = {
    productName: 'Fortune Mustard Oil 1L',
    brand: 'Adani Wilmar',
    issueCategory: 'Net Quantity Underweight / Missing',
    citizenDescription: 'Pouch weighed only 880g net',
    location: 'Tezpur Bazaar, Sonitpur, Assam (784001)',
    locality: 'Tezpur Bazaar',
    district: 'Sonitpur',
    state: 'Assam',
    pincode: '784001',
    latitude: 26.633,
    longitude: 92.792,
  };

  const resTezpur = await request('POST', '/api/complaints', tezpurPayload);
  const compTezpur = resTezpur.body?.complaint;

  record(
    'TEST 9: Complaint at Tezpur Bazaar routes to LM-028 (Inspector S. Sharma)',
    compTezpur?.inspectorId === 'LM-028' && compTezpur?.assignmentStatus === 'ASSIGNED',
    `Assigned: ${compTezpur?.inspectorName} (${compTezpur?.inspectorId}), Reason: "${compTezpur?.assignmentReason}"`
  );

  // ── TEST 10: Geographic Jurisdiction Integrity ────────────────────────────
  console.log('\n--- TEST 10: Jurisdiction Protection (No Cross-Zone Misassignment) ---');
  record(
    'TEST 10: LM-042 (Guwahati) was NOT assigned to Tezpur despite proximity',
    compTezpur?.inspectorId !== 'LM-042',
    `Tezpur assigned to: ${compTezpur?.inspectorId} (Authorized for Central Assam Zone)`
  );

  // ── TEST 12: Unassigned / Out-of-State Circle Fallback ─────────────────────
  console.log('\n--- TEST 12: Pending Assignment Fallback ---');
  const outOfStatePayload = {
    productName: 'Imported Chocolate 100g',
    brand: 'Lindt',
    issueCategory: 'Country of Origin Missing',
    location: 'Connaught Place, New Delhi, Delhi (110001)',
    locality: 'Connaught Place',
    district: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    latitude: 28.631,
    longitude: 77.219,
  };

  const resOutOfState = await request('POST', '/api/complaints', outOfStatePayload);
  const compOutOfState = resOutOfState.body?.complaint;

  record(
    'TEST 12: Location outside jurisdiction becomes "Inspector Assignment Pending" with null inspectorId',
    compOutOfState?.inspectorId === null && 
    compOutOfState?.assignmentStatus === 'Inspector Assignment Pending',
    `Docket: ${compOutOfState?.id}, InspectorId: ${compOutOfState?.inspectorId}, Status: "${compOutOfState?.assignmentStatus}", Reason: "${compOutOfState?.assignmentReason}"`
  );

  // Check that this pending docket is visible in Authority Dashboard
  const resPendingCheck = await request('GET', '/api/complaints');
  const pendingInAuth = resPendingCheck.body?.complaints?.find(c => c.id === compOutOfState.id);
  record(
    'TEST 12b: Pending docket remains visible to Authority Dashboard for allocation',
    Boolean(pendingInAuth && pendingInAuth.assignmentStatus === 'Inspector Assignment Pending'),
    `Found pending docket ${pendingInAuth?.id} in authority view`
  );

  // ── TEST 13-15: Existing Flow Integrity ───────────────────────────────────
  console.log('\n--- TEST 13-15: Regression & Workflow Integrity ---');
  // Inspector Inspection workflow PATCH test
  const resPatch = await request('PATCH', `/api/complaints/${compGuwahati.id}`, {
    status: 'INSPECTION_IN_PROGRESS',
    officerRemarks: 'Field visit conducted at Fancy Bazaar store.',
  });
  record(
    'TEST 14: Existing Inspector workflow PATCH status update operates normally',
    resPatch.status === 200 && resPatch.body?.complaint?.status === 'INSPECTION_IN_PROGRESS',
    `Updated status to: ${resPatch.body?.complaint?.status}`
  );

  // Authority Overview test
  const resAuthGeo = await request('GET', '/api/authority/geo');
  record(
    'TEST 15: Existing Authority Dashboard Geographic intelligence operates normally',
    resAuthGeo.status === 200 && resAuthGeo.body?.zones?.length >= 4,
    `Zones count: ${resAuthGeo.body?.zones?.length}`
  );

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
