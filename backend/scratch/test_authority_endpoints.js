const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', err => reject(err));
  });
}

async function runTests() {
  console.log('Testing Authority Dashboard Endpoints...');

  const endpoints = [
    '/api/authority/overview',
    '/api/authority/geo',
    '/api/authority/geo?zoneId=GAU_METRO',
    '/api/authority/inspectors',
    '/api/authority/inspectors?q=Boruah',
    '/api/authority/risk',
  ];

  for (const ep of endpoints) {
    try {
      const res = await testEndpoint(ep);
      console.log(`[${res.status}] ${ep} => Success: ${res.data?.success}`);
      if (ep === '/api/authority/overview') {
        console.log('   Telemetry:', JSON.stringify(res.data?.telemetry));
      } else if (ep === '/api/authority/geo') {
        console.log(`   Zones count: ${res.data?.zones?.length}`);
      } else if (ep === '/api/authority/inspectors') {
        console.log(`   Inspectors count: ${res.data?.inspectors?.length}`);
      } else if (ep === '/api/authority/risk') {
        console.log(`   Category Risk items: ${res.data?.categoryRisk?.length}, Typologies: ${res.data?.violationTypologies?.length}`);
      }
    } catch (e) {
      console.error(`Failed ${ep}:`, e.message);
    }
  }
}

runTests();
