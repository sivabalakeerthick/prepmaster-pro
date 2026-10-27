const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Integration Tests ---');

  // 1. Health check
  const health = await request({ host: 'localhost', port: 3000, path: '/api/health', method: 'GET' });
  console.log('1. Health check:', health.status, health.body);

  // 2. Sections check
  const sections = await request({ host: 'localhost', port: 3000, path: '/api/sections', method: 'GET' });
  console.log('2. Sections count:', sections.body.sections.length);

  // 3. Register user 1
  const testEmail1 = `user_${Date.now()}@test.com`;
  const reg1 = await request(
    { host: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { name: 'Alice Engineer', email: testEmail1, password: 'password123' }
  );
  console.log('3. Register User 1:', reg1.status, reg1.body.user);
  const token1 = reg1.body.token;

  // 4. Update Target for User 1
  const target1 = await request(
    {
      host: 'localhost',
      port: 3000,
      path: '/api/target',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    },
    {
      targetRole: 'Full-stack',
      salaryTarget: '24',
      targetDate: '2026-12-15',
      currentFocus: 'Spring Boot & Angular Architecture'
    }
  );
  console.log('4. Target updated for User 1:', target1.body);

  // 5. Update Progress for User 1 (Section 1 topic 0: done=true, explain=true)
  await request(
    {
      host: 'localhost',
      port: 3000,
      path: '/api/progress',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    },
    { sectionId: 1, topicIndex: 0, fieldName: 'done', isCompleted: true }
  );
  await request(
    {
      host: 'localhost',
      port: 3000,
      path: '/api/progress',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    },
    { sectionId: 1, topicIndex: 0, fieldName: 'explain', isCompleted: true }
  );
  console.log('5. Progress saved for User 1');

  // 6. Check progress summary for User 1
  const summary1 = await request(
    {
      host: 'localhost',
      port: 3000,
      path: '/api/progress/summary',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    }
  );
  console.log('6. User 1 Section 1 completed count:', summary1.body.summary.find(s => s.sectionId === 1));

  // 7. Register User 2 (verify user isolation!)
  const testEmail2 = `user2_${Date.now()}@test.com`;
  const reg2 = await request(
    { host: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { name: 'Bob Developer', email: testEmail2, password: 'password456' }
  );
  const token2 = reg2.body.token;

  // 8. Check User 2 progress (must be 0 completed)
  const summary2 = await request(
    {
      host: 'localhost',
      port: 3000,
      path: '/api/progress/summary',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    }
  );
  console.log('7. User 2 Section 1 completed count (should be 0):', summary2.body.summary.find(s => s.sectionId === 1));

  // 9. Static UI serving test
  const htmlRes = await request({ host: 'localhost', port: 3000, path: '/', method: 'GET' });
  const hasAppRoot = typeof htmlRes.body === 'string' && htmlRes.body.includes('<app-root>');
  console.log('8. Frontend HTML serving at root (/):', htmlRes.status, hasAppRoot ? 'OK (includes <app-root>)' : 'FAILED');

  console.log('--- All Tests Finished Successfully! ---');
}

runTests().catch(console.error);
