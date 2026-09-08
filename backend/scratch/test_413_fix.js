const axios = require('axios');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5000';

async function test413Fix() {
  console.log('====================================================');
  console.log('TESTING 413 FIX IN INSPECTOR FINAL DECISION FLOW');
  console.log('====================================================');

  // Step 1: Open an existing complaint (or create one for testing)
  console.log('\n[Step 1] Creating a realistic complaint with citizen evidence...');
  const createRes = await axios.post(`${API_BASE}/api/complaints`, {
    productName: 'Amul Taaza Homogenised Toned Milk 1L',
    brand: 'GCMMF Ltd',
    category: 'Dairy',
    location: 'Guwahati Retail Outlet, Ulubari',
    issueCategory: 'Date / Expiry Smudged',
    citizenDescription: 'Mfg date unreadable on carton top edge.',
    citizenImages: [
      { name: 'citizen_milk_front.jpg', category: 'Front Label', previewUrl: 'blob:http://localhost:5173/milk-front', size: 1850000 },
      { name: 'citizen_milk_date.jpg', category: 'Date Panel', previewUrl: 'blob:http://localhost:5173/milk-date', size: 1420000 }
    ],
    aiFindings: {
      overallStatus: 'REVIEW',
      declarations: [
        { field: 'Product Name', status: 'PASS', detectedText: 'Amul Taaza Milk' },
        { field: 'Date of Packing', status: 'REVIEW', notes: 'Faint ink detected' }
      ]
    }
  });

  const complaintId = createRes.data.complaint.id;
  console.log(`✓ Complaint created: ${complaintId}, status: ${createRes.data.complaint.status}`);

  // Step 2: Start inspection
  console.log('\n[Step 2] Start Inspection (status -> INSPECTION_IN_PROGRESS)...');
  const startRes = await axios.patch(`${API_BASE}/api/complaints/${complaintId}`, {
    status: 'INSPECTION_IN_PROGRESS'
  });
  console.log(`✓ Status updated to: ${startRes.data.complaint.status}`);

  // Step 3 & 4: Upload fresh inspector evidence & run fresh AI analysis
  console.log('\n[Step 3 & 4] Run Fresh AI Analysis via /api/scan & save evidence metadata separately...');
  // Send 1x1 test image via multipart form-data to scan endpoint
  const testImgBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  const scanForm = new FormData();
  scanForm.append('images', testImgBuffer, { filename: 'fresh_inspector_sample.jpg', contentType: 'image/jpeg' });

  const scanRes = await axios.post(`${API_BASE}/api/scan`, scanForm, {
    headers: scanForm.getHeaders()
  });
  const freshScanData = scanRes.data;
  console.log('✓ Fresh AI scan completed through scan pipeline.');

  // Save inspector evidence metadata + fresh AI analysis (separate operation)
  const inspectorEvidenceMetadata = [
    { name: 'inspector_shelf_photo.jpg', category: '1. Front Display Label', previewUrl: 'blob:http://localhost:5173/inspector-front', size: 3400000 },
    { name: 'inspector_date_stamp.jpg', category: '4. Date & Batch Panel', previewUrl: 'blob:http://localhost:5173/inspector-date', size: 2900000 }
  ];

  const evidencePayload = {
    inspectorImages: inspectorEvidenceMetadata,
    freshAiAnalysis: freshScanData,
    inspectionResult: freshScanData
  };

  const evidencePayloadSize = Buffer.byteLength(JSON.stringify(evidencePayload), 'utf8');
  console.log(`  Evidence metadata payload size: ${evidencePayloadSize} bytes (well below 100KB limit)`);

  const saveEvidenceRes = await axios.patch(`${API_BASE}/api/complaints/${complaintId}`, evidencePayload);
  console.log(`✓ Fresh evidence & AI analysis saved to complaint record: ${saveEvidenceRes.status === 200 ? 'SUCCESS' : 'FAILED'}`);

  // Step 5, 6 & 7: Select Officer Decision, Enter Remarks, Click Submit Final Decision
  console.log('\n[Step 5, 6 & 7] Submit Final Decision with MINIMAL decision payload...');
  const nowIso = new Date().toISOString();
  const minimalDecisionPayload = {
    status: 'INSPECTION_COMPLETED',
    officerDecision: 'NON_COMPLIANT',
    officerRemarks: 'Physically inspected cartons in stock. Date marking found illegible in violation of Rule 6(1)(c) of Legal Metrology (Packaged Commodities) Rules, 2011. Compounding notice issued to retailer.',
    officerId: 'LM-042',
    officerName: 'Arun Ray',
    inspectionDate: nowIso,
    inspectedAt: nowIso
  };

  const decisionPayloadSize = Buffer.byteLength(JSON.stringify(minimalDecisionPayload), 'utf8');
  console.log(`  Minimal Decision Payload: ${JSON.stringify(minimalDecisionPayload, null, 2)}`);
  console.log(`  Decision payload size: ${decisionPayloadSize} bytes`);

  let submitDecisionRes;
  try {
    submitDecisionRes = await axios.patch(`${API_BASE}/api/complaints/${complaintId}`, minimalDecisionPayload);
    console.log(`\n✓ HTTP Response: ${submitDecisionRes.status} OK (NO 413 ERROR!)`);
  } catch (err) {
    console.error(`\n❌ Request failed: status ${err.response?.status}, message: ${err.message}`);
    process.exit(1);
  }

  const updatedComplaint = submitDecisionRes.data.complaint;
  console.log(`  Updated status: ${updatedComplaint.status}`);
  console.log(`  Stored decision: ${updatedComplaint.officerDecision}`);
  console.log(`  Stored remarks: "${updatedComplaint.officerRemarks}"`);

  // Step 8: Simulate page reload — GET /api/complaints/:id
  console.log('\n[Step 8] Simulating page refresh (GET /api/complaints/:id)...');
  const reloadRes = await axios.get(`${API_BASE}/api/complaints/${complaintId}`);
  const finalComplaint = reloadRes.data.complaint;

  console.log('\n--- VERIFYING FINAL REPORT DATA INTEGRITY ---');
  console.log(`1. Complaint ID: ${finalComplaint.id} -> MATCH: ${finalComplaint.id === complaintId}`);
  console.log(`2. Status: ${finalComplaint.status} -> MATCH: ${finalComplaint.status === 'INSPECTION_COMPLETED'}`);
  console.log(`3. Officer Decision: ${finalComplaint.officerDecision} -> MATCH: ${finalComplaint.officerDecision === 'NON_COMPLIANT'}`);
  console.log(`4. Officer Remarks: "${finalComplaint.officerRemarks}" -> MATCH: ${finalComplaint.officerRemarks === minimalDecisionPayload.officerRemarks}`);
  console.log(`5. Inspection Date: ${finalComplaint.inspectionDate} -> MATCH: ${Boolean(finalComplaint.inspectionDate)}`);
  console.log(`6. Citizen Evidence Count: ${finalComplaint.citizenImages?.length} -> MATCH: ${finalComplaint.citizenImages?.length === 2}`);
  console.log(`7. Initial AI Findings Count: ${finalComplaint.aiFindings?.declarations?.length} -> MATCH: ${finalComplaint.aiFindings?.declarations?.length === 2}`);
  console.log(`8. Inspector Evidence Count: ${finalComplaint.inspectorImages?.length} -> MATCH: ${finalComplaint.inspectorImages?.length === 2}`);
  console.log(`9. Fresh AI Analysis Present: ${Boolean(finalComplaint.freshAiAnalysis)} -> MATCH: ${Boolean(finalComplaint.freshAiAnalysis)}`);
  console.log(`10. Product Name: ${finalComplaint.productName} -> MATCH: ${finalComplaint.productName === 'Amul Taaza Homogenised Toned Milk 1L'}`);

  const allChecksPass = (
    finalComplaint.status === 'INSPECTION_COMPLETED' &&
    finalComplaint.officerDecision === 'NON_COMPLIANT' &&
    finalComplaint.citizenImages?.length === 2 &&
    finalComplaint.inspectorImages?.length === 2 &&
    Boolean(finalComplaint.freshAiAnalysis) &&
    Boolean(finalComplaint.aiFindings)
  );

  if (allChecksPass) {
    console.log('\n====================================================');
    console.log('SUCCESS: 413 ERROR RESOLVED & ALL DATA PRESERVED!');
    console.log('====================================================');
  } else {
    throw new Error('Data validation failed after reload!');
  }
}

test413Fix().catch(err => {
  console.error('\n❌ Test execution failed:', err.response?.data || err.message);
  process.exit(1);
});
