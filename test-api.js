// Test script for HENRY API
const https = require('https');

const testData = {
  messages: [{ role: 'user', text: 'hello' }]
};

const req = https.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/jarvis',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(JSON.stringify(testData));
req.end();
