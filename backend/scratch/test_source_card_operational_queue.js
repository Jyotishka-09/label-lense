const axios = require('axios');

const API_BASE = 'http://localhost:5000';

const isCompletedStatus = (status) => {
  const s = (status || '').toUpperCase().trim();
  return s === 'INSPECTION_COMPLETED' || s === 'INSPECTION COMPLETED' || s === 'COMPLETED' || s === 'CLOSED' || s === 'RESOLVED';
};

async function runOperationalCountTests() {
  console.log('================================================================');
  console.log('TEST SUITE: INSPECTOR DASHBOARD SOURCE-BASED OPERATIONAL QUEUE');
  console.log('================================================================');

  // Step 1: Initial Database Verification
  console.log('\n--- STEP 1: INITIAL STATE ---');
  const res1 = await axios.get(`${API_BASE}/api/complaints`);
  const all1 = res1.data.complaints;
  
  const authOpen1 = all1.filter(c => c.source === 'authority_assigned' && !isCompletedStatus(c.status)).length;
  const consumerOpen1 = all1.filter(c => c.source === 'consumer_complaint' && !isCompletedStatus(c.status)).length;
  const authCompleted1 = all1.filter(c => c.source === 'authority_assigned' && isCompletedStatus(c.status)).length;
  const consumerCompleted1 = all1.filter(c => c.source === 'consumer_complaint' && isCompletedStatus(c.status)).length;

  console.log(`Top Card: Tasks from Authority: ${authOpen1} (Expected: 2)`);
  console.log(`Top Card: Complaints from Consumer: ${consumerOpen1} (Expected: 5)`);
  console.log(`Historical Completed: Authority=${authCompleted1}, Consumer=${consumerCompleted1}`);

  if (authOpen1 !== 2) throw new Error(`Expected authority_assigned open count 2, got ${authOpen1}`);
  if (consumerOpen1 !== 5) throw new Error(`Expected consumer_complaint open count 5, got ${consumerOpen1}`);
  if (authCompleted1 !== 1) throw new Error(`Expected authority completed 1 (A3), got ${authCompleted1}`);
  if (consumerCompleted1 !== 0) throw new Error(`Expected consumer completed 0, got ${consumerCompleted1}`);
  console.log('✓ Initial counts match operational queue requirements exactly!');

  // Identify C1, C2, C3, C4, C5
  const consumerTasks = all1.filter(c => c.source === 'consumer_complaint');
  const c1 = consumerTasks[0]; // LL-2026-0004
  const c2 = consumerTasks[1]; // LL-2026-0005
  const c3 = consumerTasks[2]; // LL-2026-0006
  const c4 = consumerTasks[3]; // LL-2026-0007
  const c5 = consumerTasks[4]; // LL-2026-0008

  // Step 2: Complete C1
  console.log(`\n--- STEP 2: COMPLETE C1 (${c1.id} - ${c1.productName}) ---`);
  await axios.patch(`${API_BASE}/api/complaints/${c1.id}`, {
    status: 'INSPECTION_COMPLETED',
    officerDecision: 'COMPLIANT',
    officerRemarks: 'Verification completed for C1.'
  });

  const res2 = await axios.get(`${API_BASE}/api/complaints`);
  const all2 = res2.data.complaints;
  const consumerOpen2 = all2.filter(c => c.source === 'consumer_complaint' && !isCompletedStatus(c.status)).length;
  const consumerScoped2 = all2.filter(c => c.source === 'consumer_complaint');
  const consumerCompleted2 = consumerScoped2.filter(c => isCompletedStatus(c.status)).length;

  console.log(`Top Card: Complaints from Consumer: ${consumerOpen2} (Expected: 4)`);
  console.log(`Scoped View Total: ${consumerScoped2.length}, Completed: ${consumerCompleted2}`);
  if (consumerOpen2 !== 4) throw new Error(`Expected consumer count 4, got ${consumerOpen2}`);
  if (consumerCompleted2 !== 1) throw new Error(`Expected scoped completed count 1, got ${consumerCompleted2}`);
  const c1InCompleted = consumerScoped2.find(c => c.id === c1.id && isCompletedStatus(c.status));
  if (!c1InCompleted) throw new Error('C1 not found in completed history!');
  console.log(`✓ C1 successfully moved out of open queue while remaining in Completed history (${c1InCompleted.id})!`);

  // Step 3: Complete C2
  console.log(`\n--- STEP 3: COMPLETE C2 (${c2.id} - ${c2.productName}) ---`);
  await axios.patch(`${API_BASE}/api/complaints/${c2.id}`, {
    status: 'INSPECTION_COMPLETED',
    officerDecision: 'NON_COMPLIANT',
    officerRemarks: 'Verification completed for C2.'
  });

  const res3 = await axios.get(`${API_BASE}/api/complaints`);
  const all3 = res3.data.complaints;
  const consumerOpen3 = all3.filter(c => c.source === 'consumer_complaint' && !isCompletedStatus(c.status)).length;
  const consumerScoped3 = all3.filter(c => c.source === 'consumer_complaint');
  const consumerCompleted3 = consumerScoped3.filter(c => isCompletedStatus(c.status)).length;

  console.log(`Top Card: Complaints from Consumer: ${consumerOpen3} (Expected: 3)`);
  console.log(`Scoped View Total: ${consumerScoped3.length}, Completed: ${consumerCompleted3}`);
  if (consumerOpen3 !== 3) throw new Error(`Expected consumer count 3, got ${consumerOpen3}`);
  if (consumerCompleted3 !== 2) throw new Error(`Expected scoped completed count 2, got ${consumerCompleted3}`);
  console.log('✓ C2 successfully completed, operational queue reduced to 3!');

  // Step 4: Complete C3, C4, C5
  console.log('\n--- STEP 4: COMPLETE REMAINING CONSUMER COMPLAINTS (C3, C4, C5) ---');
  for (const c of [c3, c4, c5]) {
    await axios.patch(`${API_BASE}/api/complaints/${c.id}`, {
      status: 'INSPECTION_COMPLETED',
      officerDecision: 'COMPLIANT',
      officerRemarks: `Completed for ${c.id}`
    });
  }

  const res4 = await axios.get(`${API_BASE}/api/complaints`);
  const all4 = res4.data.complaints;
  const consumerOpen4 = all4.filter(c => c.source === 'consumer_complaint' && !isCompletedStatus(c.status)).length;
  const consumerScoped4 = all4.filter(c => c.source === 'consumer_complaint');
  const consumerCompleted4 = consumerScoped4.filter(c => isCompletedStatus(c.status)).length;

  console.log(`Top Card: Complaints from Consumer: ${consumerOpen4} (Expected: 0)`);
  console.log(`Scoped View Total: ${consumerScoped4.length}, Completed: ${consumerCompleted4} (Expected: 5)`);
  if (consumerOpen4 !== 0) throw new Error(`Expected consumer count 0, got ${consumerOpen4}`);
  if (consumerCompleted4 !== 5) throw new Error(`Expected scoped completed count 5, got ${consumerCompleted4}`);
  console.log('✓ All 5 consumer complaints completed: Top card shows 0, Completed history shows 5!');

  // Step 5: Authority Tasks Flow
  console.log('\n--- STEP 5: AUTHORITY TASKS PROGRESSION ---');
  const authTasks = all4.filter(c => c.source === 'authority_assigned');
  const a1 = authTasks.find(c => c.id === 'LL-2026-0001');
  const a2 = authTasks.find(c => c.id === 'LL-2026-0002');
  const a3 = authTasks.find(c => c.id === 'LL-2026-0003');

  const authOpenInit = all4.filter(c => c.source === 'authority_assigned' && !isCompletedStatus(c.status)).length;
  console.log(`Initial Tasks from Authority: ${authOpenInit} (Expected: 2)`);

  // Complete A1
  console.log(`Completing A1 (${a1.id})...`);
  await axios.patch(`${API_BASE}/api/complaints/${a1.id}`, {
    status: 'INSPECTION_COMPLETED',
    officerDecision: 'COMPLIANT',
    officerRemarks: 'Audit completed for A1.'
  });

  const res5 = await axios.get(`${API_BASE}/api/complaints`);
  const authOpen5 = res5.data.complaints.filter(c => c.source === 'authority_assigned' && !isCompletedStatus(c.status)).length;
  const authCompleted5 = res5.data.complaints.filter(c => c.source === 'authority_assigned' && isCompletedStatus(c.status)).length;
  console.log(`Top Card after completing A1: Tasks from Authority = ${authOpen5} (Expected: 1)`);
  console.log(`Completed Authority Tasks in history = ${authCompleted5} (Expected: 2: A1, A3)`);
  if (authOpen5 !== 1) throw new Error(`Expected authority count 1, got ${authOpen5}`);
  if (authCompleted5 !== 2) throw new Error(`Expected authority completed 2, got ${authCompleted5}`);

  // Complete A2
  console.log(`Completing A2 (${a2.id})...`);
  await axios.patch(`${API_BASE}/api/complaints/${a2.id}`, {
    status: 'INSPECTION_COMPLETED',
    officerDecision: 'COMPLIANT',
    officerRemarks: 'Audit completed for A2.'
  });

  const res6 = await axios.get(`${API_BASE}/api/complaints`);
  const authOpen6 = res6.data.complaints.filter(c => c.source === 'authority_assigned' && !isCompletedStatus(c.status)).length;
  const authCompleted6 = res6.data.complaints.filter(c => c.source === 'authority_assigned' && isCompletedStatus(c.status)).length;
  console.log(`Top Card after completing A2: Tasks from Authority = ${authOpen6} (Expected: 0)`);
  console.log(`Completed Authority Tasks in history = ${authCompleted6} (Expected: 3: A1, A2, A3)`);
  if (authOpen6 !== 0) throw new Error(`Expected authority count 0, got ${authOpen6}`);
  if (authCompleted6 !== 3) throw new Error(`Expected authority completed 3, got ${authCompleted6}`);

  console.log('\n--- STEP 6: DATA PRESERVATION & NON-MUTATION CHECK ---');
  const finalAll = res6.data.complaints;
  console.log(`Total tasks in database: ${finalAll.length} (Expected: 8)`);
  if (finalAll.length !== 8) throw new Error(`Expected 8 tasks, got ${finalAll.length}`);
  for (const t of finalAll) {
    if (!t.source || (t.source !== 'authority_assigned' && t.source !== 'consumer_complaint')) {
      throw new Error(`Invalid or modified source on task ${t.id}: ${t.source}`);
    }
    if (t.source === 'consumer_complaint' && !t.complaint_id) {
      throw new Error(`complaint_id missing or mutated on ${t.id}`);
    }
  }
  console.log('✓ All 8 tasks preserved with intact source, complaint_id, and full audit trail!');

  console.log('\n================================================================');
  console.log('ALL OPERATIONAL QUEUE & SOURCE-BASED COUNT TESTS PASSED!');
  console.log('================================================================');
}

runOperationalCountTests().catch(err => {
  console.error('\n❌ Test Error:', err.response?.data || err.message);
  process.exit(1);
});
