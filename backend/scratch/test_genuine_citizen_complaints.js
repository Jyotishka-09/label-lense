const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== VERIFYING GENUINE CITIZEN COMPLAINTS & COMPLETE GEO MASTER ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Complete Official States and UTs (36 total: 28 States + 8 UTs)
    console.log('1. Testing Complete State/UT Dataset (/api/authority/geo/states)');
    const stateRes = await axios.get(`${BASE_URL}/api/authority/geo/states`);
    assert(stateRes.data.success === true, 'geo/states endpoint responds successfully');
    assert(stateRes.data.totalStates === 36, `Exactly 36 States/UTs present (got ${stateRes.data.totalStates})`);
    
    const states = stateRes.data.states.filter(s => s.type === 'State');
    const uts = stateRes.data.states.filter(s => s.type === 'Union Territory');
    assert(states.length === 28, `Exactly 28 official States present (got ${states.length})`);
    assert(uts.length === 8, `Exactly 8 official Union Territories present (got ${uts.length})`);
    
    const allCodes = stateRes.data.states.map(s => s.code);
    assert(allCodes.includes('AS') && allCodes.includes('DL') && allCodes.includes('MH'), 'Official State codes (AS, DL, MH, etc.) present');

    // 2. Complete Official Districts per State/UT
    console.log('\n2. Testing Complete District Dataset (/api/authority/geo/districts)');
    const assamDistRes = await axios.get(`${BASE_URL}/api/authority/geo/districts?state=Assam`);
    assert(assamDistRes.data.success === true, 'Assam districts query succeeds');
    assert(assamDistRes.data.totalDistricts === 35, `Assam contains all 35 official districts (got ${assamDistRes.data.totalDistricts})`);
    
    const assamDistNames = assamDistRes.data.districts.map(d => d.district);
    assert(assamDistNames.includes('Cachar'), 'Cachar belongs to Assam');
    assert(assamDistNames.includes('Kamrup Metropolitan'), 'Kamrup Metropolitan belongs to Assam');
    assert(assamDistNames.includes('Sonitpur'), 'Sonitpur belongs to Assam');
    assert(!assamDistNames.includes('New Delhi'), 'Assam does NOT contain districts of other states (e.g. New Delhi)');

    const delhiDistRes = await axios.get(`${BASE_URL}/api/authority/geo/districts?state=Delhi`);
    assert(delhiDistRes.data.totalDistricts === 11, `Delhi contains all 11 official districts (got ${delhiDistRes.data.totalDistricts})`);

    // 3. Genuine Citizen Complaints Only (source === 'consumer_complaint')
    console.log('\n3. Testing Genuine Citizen Complaints Only (/api/complaints?source=consumer_complaint)');
    const compRes = await axios.get(`${BASE_URL}/api/complaints?source=consumer_complaint`);
    assert(compRes.data.success === true, 'Citizen complaints query succeeds');
    assert(compRes.data.complaints.length > 0, 'Genuine citizen complaints exist in DB');
    
    const nonConsumer = compRes.data.complaints.filter(c => c.source !== 'consumer_complaint');
    assert(nonConsumer.length === 0, 'ZERO non-citizen or authority dummy tasks returned');
    console.log(`   Found ${compRes.data.complaints.length} genuine citizen complaints in database.`);

    // 4. State Filter: Assam
    console.log('\n4. Testing State Filter: Assam');
    const assamCompRes = await axios.get(`${BASE_URL}/api/complaints?source=consumer_complaint&state=Assam`);
    assert(assamCompRes.data.success === true, 'Assam citizen complaints query succeeds');
    assert(assamCompRes.data.complaints.length >= 5, `Expected at least 5 citizen complaints from Assam (got ${assamCompRes.data.complaints.length})`);
    const foreignToAssam = assamCompRes.data.complaints.filter(c => c.state && c.state.toLowerCase() !== 'assam');
    assert(foreignToAssam.length === 0, 'All returned complaints strictly belong to Assam');

    // 5. District Filter: Assam -> Cachar
    console.log('\n5. Testing District Filter: Assam -> Cachar');
    const cacharCompRes = await axios.get(`${BASE_URL}/api/complaints?source=consumer_complaint&state=Assam&district=Cachar`);
    assert(cacharCompRes.data.success === true, 'Assam -> Cachar citizen complaints query succeeds');
    assert(cacharCompRes.data.complaints.length === 3, `Expected 3 citizen complaints from Cachar (got ${cacharCompRes.data.complaints.length})`);
    const nonCachar = cacharCompRes.data.complaints.filter(c => c.district && c.district.toLowerCase() !== 'cachar');
    assert(nonCachar.length === 0, 'All returned complaints strictly belong to Cachar district');

    // 6. Empty State when filtered state/district has zero complaints
    console.log('\n6. Testing Clean Empty State');
    const goaCompRes = await axios.get(`${BASE_URL}/api/complaints?source=consumer_complaint&state=Goa`);
    assert(goaCompRes.data.complaints.length === 0, 'Zero complaints returned for Goa (matches clean empty state)');
    
    const bajaliCompRes = await axios.get(`${BASE_URL}/api/complaints?source=consumer_complaint&state=Assam&district=Bajali`);
    assert(bajaliCompRes.data.complaints.length === 0, 'Zero complaints returned for Bajali (matches clean empty state)');

    // 7. Authority Scope Enforcement (HTTP 403)
    console.log('\n7. Testing Authority Scope Enforcement (HTTP 403)');
    try {
      await axios.get(`${BASE_URL}/api/complaints?source=consumer_complaint&state=Delhi`, {
        headers: { 'x-authority-state': 'Assam' }
      });
      assert(false, 'Should have rejected cross-scope access with HTTP 403');
    } catch (err) {
      assert(err.response && err.response.status === 403, 'Authority scoped to Assam receives HTTP 403 when requesting Delhi');
    }

    // 8. Checking Unverified Location Handling (LL-2026-0001)
    console.log('\n8. Checking Unverified Location Record (LL-2026-0001)');
    const unverifiedRec = compRes.data.complaints.find(c => c.id === 'LL-2026-0001');
    assert(unverifiedRec && !unverifiedRec.state && !unverifiedRec.district, 'LL-2026-0001 has no verified state/district and is marked Location Unverified');

  } catch (err) {
    console.error('Test execution failed:', err.message);
    failed++;
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests();
