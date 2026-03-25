const http = require('http');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, error: data });
        }
      });
    }).on('error', (err) => reject(err));
  });
}

async function testApi() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('--- TEST: /dashboard/api/stats ---');
    const res1 = await getJson(`${baseUrl}/dashboard/api/stats`);
    console.log('JSON Result:', JSON.stringify(res1, null, 2));

    console.log('\n--- TEST: /requests/api/list ---');
    const res2 = await getJson(`${baseUrl}/requests/api/list`);
    console.log('JSON Result:', JSON.stringify(res2, null, 2));

  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testApi();
