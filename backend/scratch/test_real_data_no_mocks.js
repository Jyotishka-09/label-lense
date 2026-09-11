const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000';
const DATA_FILE = path.join(__dirname, '../data/complaints.json');

const isCompletedStatus = (status) => {
  const s = (status || '').toUpperCase().trim();
  return s === 'INSPECTION_COMPLETED' || s === 'INSPECTION COMPLETED' || s === 'COMPLETED' || s === 'CLOSED' || s === 'RESOLVED';
};

async function testRealDataAndNoMocks() {
  console.log('================================================================');
  console.log('TEST SUITE: REAL DATABASE SOURCE OF TRUTH & NO DUMMY DATA');
  console.log('================================================================');

  // STEP 1: Clean start / Empty Database Verification
  console.log('\n--- STEP 1: VERIFY EMPTY DATABASE BEHAVIOR ---');
  // Ensure data file is empty for clean verification
  if (fs.existsSync(DATA_FILE)) {
    fs.unlinkSync(DATA_FILE);
  }
  // Trigger reload by restarting or empty check
  const emptyRes = await axios.get(`${API_BASE}/api/complaints`);
  console.log('API Response for empty database:', JSON.stringify(emptyRes.data.counts, null, 2));

  if (emptyRes.data.complaints.length !== 0) {
    throw new Error(`Expected 0 complaints, found ${emptyRes.data.complaints.length}`);
  }
  if (emptyRes.data.counts.total !== 0) {
    throw new Error(`Expected total count 0, got ${emptyRes.data.counts.total}`);
  }
  if (emptyRes.data.counts.authority_assigned !== 0) {
    throw new Error(`Expected authority_assigned count 0, got ${emptyRes.data.counts.authority_assigned}`);
  }
  if (emptyRes.data.counts.consumer_complaint !== 0) {
    throw new Error(`Expected consumer_complaint count 0, got ${emptyRes.data.counts.consumer_complaint}`);
  }
  console.log('✓ Database is completely empty on startup: 0 dummy rows, 0 fake counts.');

  // STEP 2: Citizen Files Real Complaint
  console.log('\n--- STEP 2: CITIZEN FILES REAL COMPLAINT ---');
  const realCitizenPayload = {
    citizenId: 'CIT-REAL-101',
    citizenName: 'Anita Goswami',
    citizenContact: 'anita.g@realtest.in',
    productName: "Lay's American Style Cream & Onion 50g",
    brand: 'PepsiCo India Holdings Pvt. Ltd.',
    category: 'Snack Food',
    sourceType: 'Retail Store',
    location: 'Daily Bazaar, Silpukhuri, Guwahati',
    pincode: '781003',
    issueCategory: 'MRP / Price Discrepancy',
    citizenDescription: 'Retailer overcharged ₹25 on printed ₹20 packet.',
    extractedData: {
      product_name: "Lay's American Style Cream & Onion",
      mrp: '20',
      net_quantity: '50 g'
    },
    aiFindings: {
      overallStatus: 'POTENTIAL NON-COMPLIANCE',
      declarations: [
        { field: 'MRP', status: 'POTENTIAL NON-COMPLIANCE', notes: 'Price charged exceeds printed MRP' }
      ]
    },
    citizenImages: [
      { name: 'lays_front.jpg', category: '1. Front Display Label', previewUrl: 'data:image/jpeg;base64,...', size: 350000 }
    ]
  };

  const createRes1 = await axios.post(`${API_BASE}/api/complaints`, realCitizenPayload);
  const realC1 = createRes1.data.complaint;
  console.log(`✓ Real Citizen Complaint Created: ${realC1.id}`);
  console.log(`  Source: ${realC1.source}`);
  console.log(`  Complaint ID: ${realC1.complaint_id}`);
  console.log(`  Status: ${realC1.status}`);

  if (realC1.source !== 'consumer_complaint') throw new Error('Expected source consumer_complaint');
  if (!realC1.complaint_id) throw new Error('Expected non-null complaint_id');

  // STEP 3: Authority Portal Assigns Real Task
  console.log('\n--- STEP 3: AUTHORITY ASSIGNS REAL TASK ---');
  const realAuthorityPayload = {
    source: 'authority_assigned',
    citizenId: 'authority',
    citizenName: 'Legal Metrology Directorate',
    citizenContact: 'enforcement@lm.gov.in',
    productName: 'Tata Salt Vacuum Evaporated 1kg',
    brand: 'Tata Consumer Products Ltd',
    category: 'Packaged Salt',
    sourceType: 'Wholesale Depot',
    location: 'Central Grain & Commodity Depot, Beltola',
    pincode: '781028',
    issueCategory: 'Routine Surveillance Audit',
    citizenDescription: 'Statutory net quantity weighment verification scheduled.',
    extractedData: {
      product_name: 'Tata Salt Vacuum Evaporated',
      mrp: '28',
      net_quantity: '1 kg'
    },
    aiFindings: { overallStatus: 'PASS', declarations: [] },
    citizenImages: []
  };

  const createRes2 = await axios.post(`${API_BASE}/api/complaints`, realAuthorityPayload);
  const realA1 = createRes2.data.complaint;
  console.log(`✓ Real Authority Task Created: ${realA1.id}`);
  console.log(`  Source: ${realA1.source}`);
  console.log(`  Complaint ID: ${realA1.complaint_id} (Expected: null)`);
  console.log(`  Status: ${realA1.status}`);

  if (realA1.source !== 'authority_assigned') throw new Error('Expected source authority_assigned');
  if (realA1.complaint_id !== null) throw new Error('Expected complaint_id to be null for authority task');

  // STEP 4: Verify Inspector Dashboard Counts on Real Data
  console.log('\n--- STEP 4: VERIFY INSPECTOR DASHBOARD REAL COUNTS ---');
  const dashRes1 = await axios.get(`${API_BASE}/api/complaints`);
  const allTasks = dashRes1.data.complaints;
  
  const authOpen = allTasks.filter(c => c.source === 'authority_assigned' && !isCompletedStatus(c.status)).length;
  const consumerOpen = allTasks.filter(c => c.source === 'consumer_complaint' && !isCompletedStatus(c.status)).length;
  const pending = allTasks.filter(c => c.status === 'SUBMITTED' || c.status === 'PENDING').length;
  const underInspection = allTasks.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'INSPECTION_IN_PROGRESS').length;
  const completed = allTasks.filter(c => isCompletedStatus(c.status)).length;

  console.log(`Tasks from Authority Card: ${authOpen} (Expected: 1)`);
  console.log(`Complaints from Consumer Card: ${consumerOpen} (Expected: 1)`);
  console.log(`Status Cards: Pending=${pending}, UnderInspection=${underInspection}, Completed=${completed}`);

  if (authOpen !== 1) throw new Error(`Expected authority count 1, got ${authOpen}`);
  if (consumerOpen !== 1) throw new Error(`Expected consumer count 1, got ${consumerOpen}`);
  if (pending !== 2) throw new Error(`Expected pending count 2, got ${pending}`);
  if (underInspection !== 0) throw new Error(`Expected underInspection count 0, got ${underInspection}`);
  if (completed !== 0) throw new Error(`Expected completed count 0, got ${completed}`);

  // STEP 5: Inspector Workflow Progression on Real Data
  console.log('\n--- STEP 5: INSPECTOR WORKFLOW PROGRESSION ---');
  // Start inspection on realC1
  console.log(`Starting inspection on real complaint ${realC1.id}...`);
  await axios.patch(`${API_BASE}/api/complaints/${realC1.id}`, {
    status: 'INSPECTION_IN_PROGRESS'
  });

  const dashRes2 = await axios.get(`${API_BASE}/api/complaints`);
  const pending2 = dashRes2.data.complaints.filter(c => c.status === 'SUBMITTED' || c.status === 'PENDING').length;
  const underInspection2 = dashRes2.data.complaints.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'INSPECTION_IN_PROGRESS').length;
  console.log(`After starting inspection: Pending=${pending2}, UnderInspection=${underInspection2}`);
  if (pending2 !== 1 || underInspection2 !== 1) throw new Error('Status transition failed!');

  // Complete inspection on realC1
  console.log(`Completing inspection on real complaint ${realC1.id}...`);
  await axios.patch(`${API_BASE}/api/complaints/${realC1.id}`, {
    status: 'INSPECTION_COMPLETED',
    officerDecision: 'NON_COMPLIANT',
    officerRemarks: 'Physical verification at retailer confirmed price overcharge above declared MRP.'
  });

  const dashRes3 = await axios.get(`${API_BASE}/api/complaints`);
  const finalTasks = dashRes3.data.complaints;
  const consumerOpenFinal = finalTasks.filter(c => c.source === 'consumer_complaint' && !isCompletedStatus(c.status)).length;
  const completedFinal = finalTasks.filter(c => isCompletedStatus(c.status)).length;

  console.log(`After completion: Complaints from Consumer Card=${consumerOpenFinal} (Expected: 0)`);
  console.log(`Completed History Count=${completedFinal} (Expected: 1)`);

  if (consumerOpenFinal !== 0) throw new Error(`Expected open consumer count 0, got ${consumerOpenFinal}`);
  if (completedFinal !== 1) throw new Error(`Expected completed count 1, got ${completedFinal}`);

  // STEP 6: Persistence to Disk Check
  console.log('\n--- STEP 6: VERIFY PERSISTENCE TO DISK ---');
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error('Expected complaints.json to exist on disk!');
  }
  const diskRaw = fs.readFileSync(DATA_FILE, 'utf-8');
  const diskData = JSON.parse(diskRaw);
  console.log(`✓ Data file on disk contains ${diskData.length} real persisted records.`);
  if (diskData.length !== 2) throw new Error(`Expected 2 records on disk, found ${diskData.length}`);

  // Verify real details of persisted tasks
  const savedC1 = diskData.find(c => c.id === realC1.id);
  if (!savedC1 || savedC1.productName !== "Lay's American Style Cream & Onion 50g") {
    throw new Error('Real task data integrity check failed on disk!');
  }
  console.log(`✓ Real task data integrity confirmed on disk: ID=${savedC1.id}, Product=${savedC1.productName}, Decision=${savedC1.officerDecision}`);

  console.log('\n================================================================');
  console.log('ALL REAL DATA & NO-MOCK TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

testRealDataAndNoMocks().catch(err => {
  console.error('\n❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
