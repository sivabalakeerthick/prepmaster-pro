const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const targetRoutes = require('./routes/target');
const interviewSections = require('./data/interviewTopics.json');
const dsaData = require('./data/dsaTopics.json');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS Whitelist Configuration
const allowedOrigins = [
  'https://careermaster.vercel.app',
  'http://localhost:4200',
  'http://localhost:3000'
];

if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('your-app-name')) {
  const envFrontend = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(envFrontend)) {
    allowedOrigins.push(envFrontend);
  }
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g. UptimeRobot keep-alive, server proxies, curl)
    if (!origin) return callback(null, true);

    // Allow approved domains and all Vercel deployment aliases (*.vercel.app)
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Disallow unauthorized third-party origins
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Public endpoints
app.get('/api/sections', (req, res) => {
  res.json({
    sections: interviewSections,
    interview: interviewSections,
    dsa: dsaData
  });
});

app.get('/api/dsa', (req, res) => {
  res.json(dsaData);
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/target', targetRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend production build if available
const staticDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist', 'frontend', 'browser');
if (fs.existsSync(staticDistPath)) {
  app.use(express.static(staticDistPath));
}

// 404 handler for unmatched API requests (prevents hanging requests)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// SPA fallback for HTML5 routing
app.get('*', (req, res) => {
  if (fs.existsSync(staticDistPath)) {
    res.sendFile(path.join(staticDistPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Frontend build not found. Please build frontend first.' });
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Interview & DSA Prep API running on http://localhost:${PORT}`);
    console.log(`📋 Sections endpoint: http://localhost:${PORT}/api/sections`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
