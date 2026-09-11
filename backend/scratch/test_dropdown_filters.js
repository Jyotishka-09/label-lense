const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING FILTER DROPDOWNS INTEGRATION TESTS ===\n');
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
    // 1. Check real states returned by /api/authority/complaints/by-state
    console.log('1. Testing /api/authority/complaints/by-state');
    const stateRes = await axios.get(`${BASE_URL}/api/authority/complaints/by-state`);
    assert(stateRes.data.success === true, 'by-state endpoint succeeds');
    assert(Array.isArray(stateRes.data.states), 'states array is returned');
    console.log('   Available States:', stateRes.data.states.map(s => `${s.state} (${s.complaintCount})`));
    const stateNames = stateRes.data.states.map(s => s.state);
    assert(stateNames.includes('Assam'), 'Real state Assam is present');

    // 2. Check districts for Assam
    console.log('\n2. Testing /api/authority/complaints/by-district?state=Assam');
    const assamDistRes = await axios.get(`${BASE_URL}/api/authority/complaints/by-district?state=Assam`);
    assert(assamDistRes.data.success === true, 'by-district for Assam succeeds');
    assert(assamDistRes.data.districts.length > 0, 'Assam has real districts');
    const assamDistricts = assamDistRes.data.districts.map(d => d.district);
    console.log('   Assam Districts:', assamDistRes.data.districts.map(d => `${d.district} (${d.complaintCount})`));
    assert(assamDistricts.includes('Cachar'), 'Assam contains district Cachar');
    assert(!assamDistricts.includes('New Delhi'), 'Assam does NOT contain New Delhi');

    // 3. Check All States + All Districts
    console.log('\n3. Testing All States + All Districts (/api/complaints)');
    const allComplaintsRes = await axios.get(`${BASE_URL}/api/complaints`);
    assert(allComplaintsRes.data.success === true, 'All complaints fetch succeeds');
    const allCount = allComplaintsRes.data.complaints.length;
    console.log(`   Total complaints in DB: ${allCount}`);
    assert(allCount > 0, 'Complaints exist in DB');

    // 4. Check Selected State + All Districts
    console.log('\n4. Testing Selected State (Assam) + All Districts');
    const assamCompRes = await axios.get(`${BASE_URL}/api/complaints?state=Assam`);
    assert(assamCompRes.data.success === true, 'Assam complaints fetch succeeds');
    const assamCount = assamCompRes.data.complaints.length;
    console.log(`   Complaints for State=Assam: ${assamCount}`);
    assert(assamCount <= allCount, 'Assam complaints count is accurate subset');
    const nonAssamInAssam = assamCompRes.data.complaints.filter(c => c.state && c.state.toLowerCase() !== 'assam');
    assert(nonAssamInAssam.length === 0, 'No non-Assam complaints returned');

    // 5. Check Selected State + Selected District (Assam + Cachar)
    console.log('\n5. Testing Selected State (Assam) + Selected District (Cachar)');
    const cacharCompRes = await axios.get(`${BASE_URL}/api/complaints?state=Assam&district=Cachar`);
    assert(cacharCompRes.data.success === true, 'Assam + Cachar complaints fetch succeeds');
    const cacharCount = cacharCompRes.data.complaints.length;
    console.log(`   Complaints for State=Assam & District=Cachar: ${cacharCount}`);
    assert(cacharCount <= assamCount, 'Cachar count is <= Assam count');
    const nonCachar = cacharCompRes.data.complaints.filter(c => c.district && c.district.toLowerCase() !== 'cachar');
    assert(nonCachar.length === 0, 'Only Cachar complaints returned');

    // 6. Check No-data filter returns clean empty list
    console.log('\n6. Testing non-existent State / District');
    const emptyCompRes = await axios.get(`${BASE_URL}/api/complaints?state=Goa`);
    assert(emptyCompRes.data.success === true, 'Non-existent state request succeeds');
    assert(emptyCompRes.data.complaints.length === 0, 'Non-existent state returns 0 complaints');

    // 7. Check Authority Scope restriction
    console.log('\n7. Testing Authority Scope Enforcement (HTTP 403)');
    try {
      await axios.get(`${BASE_URL}/api/complaints?state=Delhi`, {
        headers: { 'x-authority-state': 'Assam' }
      });
      assert(false, 'Should have failed with 403 Forbidden for state outside scope');
    } catch (err) {
      assert(err.response && err.response.status === 403, 'Authority restricted to Assam gets HTTP 403 when querying Delhi');
    }

    try {
      await axios.get(`${BASE_URL}/api/authority/complaints/by-district?state=Delhi`, {
        headers: { 'x-authority-state': 'Assam' }
      });
      assert(false, 'Should have failed with 403 Forbidden for state outside scope in by-district');
    } catch (err) {
      assert(err.response && err.response.status === 403, 'by-district returns HTTP 403 when querying state outside scope');
    }

    // 8. Check unverified location record
    console.log('\n8. Checking record with unverified location (LL-2026-0001)');
    const unverifiedRec = allComplaintsRes.data.complaints.find(c => c.id === 'LL-2026-0001');
    if (unverifiedRec) {
      const isUnverified = !unverifiedRec.state && !unverifiedRec.district;
      assert(isUnverified, 'LL-2026-0001 is correctly identified as having unverified state/district');
      console.log(`   LL-2026-0001 raw location: "${unverifiedRec.location}", state: ${unverifiedRec.state}, district: ${unverifiedRec.district}`);
    } else {
      console.log('   (LL-2026-0001 not found in store)');
    }

  } catch (err) {
    console.error('Test execution error:', err.message);
    failed++;
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests();
