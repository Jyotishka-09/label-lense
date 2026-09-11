/**
 * test_conflict_selection_flow.js
 * Verifies end-to-end conflict selection:
 * 1. Demo credentials validation in auth.js (Citizen, Inspector, Authority)
 * 2. Citizen complaint submission with multiple issues + "Other" description
 * 3. Database persistence of reportedIssues and otherIssueDescription
 * 4. Inspector view retrieval
 * 5. Authority view retrieval
 * 6. Backwards compatibility for issueCategory
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function request(method, reqPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = { 'Content-Type': 'application/json', ...headers };
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: reqPath,
        method,
        headers: defaultHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Load auth validator
const authCode = fs.readFileSync(path.join(__dirname, '../../Frontend/src/context/auth.js'), 'utf-8');
const cjsCode = authCode
  .replace(/export const /g, 'const ')
  .replace(/export function /g, 'function ')
  .replace(/export default /g, '// ');

const authModule = {};
const globalMock = { sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
const evalFn = new Function('module', 'exports', 'sessionStorage', cjsCode + '\nreturn { ROLES, validateCredentials };');
const { ROLES, validateCredentials } = evalFn({ exports: authModule }, authModule, globalMock.sessionStorage);

async function runTests() {
  console.log('=== CITIZEN COMPLAINT CONFLICT SELECTION VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Verify Demo Credentials in auth.js
    console.log('1. Verifying Demo Credentials Unchanged:');
    const citizenUser = validateCredentials('citizen@labellens.com', 'Citizen@123', ROLES.CITIZEN);
    assert(citizenUser && citizenUser.role === ROLES.CITIZEN, 'Citizen demo login works (citizen@labellens.com / Citizen@123)');

    const inspectorUser = validateCredentials('inspector@labellens.gov.in', 'Inspector@123', ROLES.INSPECTOR);
    assert(inspectorUser && inspectorUser.role === ROLES.INSPECTOR, 'Inspector demo login works (inspector@labellens.gov.in / Inspector@123)');

    const authorityUser = validateCredentials('authority@labellens.gov.in', 'Authority@123', ROLES.AUTHORITY);
    assert(authorityUser && authorityUser.role === ROLES.AUTHORITY, 'Authority demo login works (authority@labellens.gov.in / Authority@123)');

    // 2. Submit Citizen Complaint with Multiple Selected Conflicts + Other
    console.log('\n2. Submitting Citizen Complaint with Multiple Selected Conflicts:');
    const multiIssuePayload = {
      citizenId: 'CIT-001',
      citizenName: 'Priya Sharma',
      citizenContact: 'citizen@labellens.com',
      productName: 'Organic Honey 500g',
      brand: 'Nature Pure',
      category: 'Packaged Commodity',
      sourceType: 'Retail Store',
      location: 'Fancy Bazaar / Panbazaar, Guwahati (781001)',
      location_address: 'Fancy Bazaar / Panbazaar, Guwahati (781001)',
      state: 'Assam',
      district: 'Kamrup Metropolitan',
      locality: 'Fancy Bazaar',
      pincode: '781001',
      latitude: 26.184,
      longitude: 91.745,
      reportedIssues: [
        'MRP / Price Discrepancy',
        'Net Quantity Underweight / Missing',
        'Label / Declaration Missing or Unreadable',
        'Other',
      ],
      otherIssueDescription: 'Price tag pasted over mandatory nutritional table.',
      citizenDescription: 'Observed price alteration sticker and package felt under 500 grams.',
    };

    const submitRes = await request('POST', '/api/complaints', multiIssuePayload);
    assert(submitRes.status === 201, `Complaint submitted successfully (HTTP 201). ID: ${submitRes.body.complaint?.id}`);

    const created = submitRes.body.complaint;
    assert(
      Array.isArray(created.reportedIssues) && created.reportedIssues.length === 4,
      `Stored reportedIssues contains 4 selected issues: ${JSON.stringify(created.reportedIssues)}`
    );
    assert(
      created.reportedIssues.includes('MRP / Price Discrepancy') &&
      created.reportedIssues.includes('Net Quantity Underweight / Missing') &&
      created.reportedIssues.includes('Label / Declaration Missing or Unreadable') &&
      created.reportedIssues.includes('Other'),
      'All 4 selected issues accurately recorded'
    );
    assert(
      created.otherIssueDescription === 'Price tag pasted over mandatory nutritional table.',
      `Stored otherIssueDescription accurately: "${created.otherIssueDescription}"`
    );
    assert(
      created.issueCategory === 'MRP / Price Discrepancy',
      `Backwards compatible issueCategory set to primary issue: "${created.issueCategory}"`
    );
    assert(
      created.inspectorId != null && created.inspectorName != null,
      `Automatic nearest inspector routing preserved: ${created.inspectorName} (${created.inspectorId})`
    );
    assert(
      created.status === 'SUBMITTED',
      'Complaint status is SUBMITTED (Citizen-Reported Allegation, NOT confirmed violation)'
    );

    // 3. Fetch Single Complaint by ID
    console.log('\n3. Verifying GET /api/complaints/:id:');
    const getRes = await request('GET', `/api/complaints/${created.id}`);
    assert(getRes.status === 200, `Retrieved complaint record by ID (HTTP 200)`);
    const fetchedRecord = getRes.body.complaint;
    assert(
      Array.isArray(fetchedRecord.reportedIssues) && fetchedRecord.reportedIssues.length === 4,
      `GET response contains reportedIssues array with 4 issues`
    );
    assert(
      fetchedRecord.otherIssueDescription === 'Price tag pasted over mandatory nutritional table.',
      `GET response contains otherIssueDescription`
    );

    // 4. Inspector View Retrieval
    console.log('\n4. Verifying Inspector View Retrieval:');
    const inspectorListRes = await request('GET', `/api/complaints?inspectorId=${created.inspectorId}`);
    assert(inspectorListRes.status === 200, 'Inspector complaints list retrieved');
    const inspectorComplaints = inspectorListRes.body.complaints || [];
    const inspectorTask = inspectorComplaints.find((t) => t.id === created.id);
    assert(inspectorTask != null, `Complaint found in assigned inspector queue (${created.inspectorId})`);
    assert(
      Array.isArray(inspectorTask.reportedIssues) && inspectorTask.reportedIssues.length === 4,
      'Inspector receives all reported issues'
    );
    assert(
      inspectorTask.inspectionResult === null,
      'Inspection finding remains unconfirmed (Citizen allegation is NOT automatically treated as confirmed violation)'
    );

    // 5. Authority View Retrieval & Filtering
    console.log('\n5. Verifying Authority View Retrieval:');
    const authorityListRes = await request('GET', `/api/complaints?source=consumer_complaint&state=Assam&district=Kamrup%20Metropolitan`);
    assert(authorityListRes.status === 200, 'Authority filtered complaints list retrieved');
    const authorityComplaints = authorityListRes.body.complaints || [];
    const authorityDocket = authorityComplaints.find((d) => d.id === created.id);
    assert(authorityDocket != null, 'Complaint found in Authority filtered complaints queue');
    assert(
      Array.isArray(authorityDocket.reportedIssues) && authorityDocket.reportedIssues.length === 4,
      'Authority receives all reported issues in same record'
    );
    assert(
      authorityDocket.otherIssueDescription === 'Price tag pasted over mandatory nutritional table.',
      'Authority receives other issue explanation'
    );

    // 6. Test Single Issue Complaint
    console.log('\n6. Verifying Single Issue Complaint Submission:');
    const singleIssuePayload = {
      citizenId: 'CIT-001',
      citizenName: 'Priya Sharma',
      productName: 'Mustard Oil 1L',
      location: 'Chandmari / Silpukhuri, Guwahati (781003)',
      state: 'Assam',
      district: 'Kamrup Metropolitan',
      locality: 'Chandmari',
      pincode: '781003',
      reportedIssues: ['Manufacturing / Packing Date Issue'],
      citizenDescription: 'Packing date missing on pouch.',
    };
    const singleRes = await request('POST', '/api/complaints', singleIssuePayload);
    assert(singleRes.status === 201, 'Single issue complaint submitted');
    assert(
      singleRes.body.complaint.reportedIssues.length === 1 &&
      singleRes.body.complaint.reportedIssues[0] === 'Manufacturing / Packing Date Issue',
      'Single issue stored correctly in reportedIssues array'
    );

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTests();
