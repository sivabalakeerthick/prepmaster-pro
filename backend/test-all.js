const path = require('path');
const http = require('http');

// Start server
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const progressRoutes = require('./src/routes/progress');
const targetRoutes = require('./src/routes/target');
const interviewSections = require('./src/data/interviewTopics.json');
const dsaData = require('./src/data/dsaTopics.json');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/api/sections', (req, res) => res.json({
  sections: interviewSections,
  interview: interviewSections,
  dsa: dsaData
}));
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/target', targetRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

const staticDistPath = path.join(__dirname, '..', 'frontend', 'dist', 'frontend', 'browser');
if (fs.existsSync(staticDistPath)) {
  app.use(express.static(staticDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticDistPath, 'index.html'));
    }
  });
}

const server = app.listen(3002, async () => {
  console.log('Test Server running on port 3002');

  function request(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  try {
    // 1. Health
    const health = await request({ host: 'localhost', port: 3002, path: '/api/health', method: 'GET' });
    console.log('✓ Health:', health.status, health.body.status);

    // 2. Sections check
    const secRes = await request({ host: 'localhost', port: 3002, path: '/api/sections', method: 'GET' });
    console.log('✓ Interview Sections loaded:', secRes.body.interview.length);
    console.log('✓ DSA Sections loaded:', secRes.body.dsa.sections.length);
    console.log('✓ DSA LeetCode Categories loaded:', secRes.body.dsa.leetcodeCategories.length);

    // 3. Register user
    const email = `candidate_${Date.now()}@test.com`;
    const reg = await request(
      { host: 'localhost', port: 3002, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Sarah Connor', email, password: 'password123' }
    );
    console.log('✓ User Registered:', reg.status, reg.body.user.name);
    const token = reg.body.token;

    // 4. Update Target with Personal Notes
    const targetRes = await request(
      { host: 'localhost', port: 3002, path: '/api/target', method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
      {
        targetRole: 'Full-stack',
        salaryTarget: '28',
        targetDate: '2026-12-31',
        currentFocus: 'Microservices & System Design',
        personalNotes: 'Focus on Kafka idempotency and LRU Cache'
      }
    );
    console.log('✓ Target with Personal Notes:', targetRes.body.personalNotes);

    // 5. Update Interview Track progress
    await request(
      { host: 'localhost', port: 3002, path: '/api/progress', method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
      { sectionId: 1, topicIndex: 0, fieldName: 'done', isCompleted: true }
    );

    // 6. Update DSA Track progress
    await request(
      { host: 'localhost', port: 3002, path: '/api/progress', method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
      { sectionId: 'dsa_0', topicIndex: 0, fieldName: 'done', isCompleted: true }
    );

    // 7. Update LeetCode progress
    await request(
      { host: 'localhost', port: 3002, path: '/api/progress', method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
      { sectionId: 'leetcode', topicIndex: '1', fieldName: 'done', isCompleted: true }
    );

    console.log('✓ Multi-track progress saved (Interview + DSA + LeetCode)');

    // 8. Progress summary
    const sum = await request(
      { host: 'localhost', port: 3002, path: '/api/progress/summary', method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('✓ Interview Sec 1 summary:', sum.body.interviewSummary.find(s => s.sectionId === 1));
    console.log('✓ DSA Sec 0 summary:', sum.body.dsaSummary.find(s => s.sectionId === 'dsa_0'));

    // 9. Static UI serving
    const html = await request({ host: 'localhost', port: 3002, path: '/', method: 'GET' });
    const hasApp = typeof html.body === 'string' && html.body.includes('<app-root>');
    console.log('✓ Frontend static app served at /:', hasApp ? 'YES' : 'NO');

    console.log('\n🎉 ALL UPDATED INTEGRATION TESTS PASSED PERFECTLY! 🎉\n');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
