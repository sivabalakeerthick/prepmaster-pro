const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'interview-prep-tracker-secret-key-2026-2027';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function getFrontendUrl(req) {
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost:3000')) {
    return process.env.FRONTEND_URL;
  }
  return `${req.protocol}://${req.get('host')}`;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = getDb();

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);
    const id = uuidv4();

    // Create user
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(id, name.trim(), normalizedEmail, passwordHash);

    const user = { id, name: name.trim(), email: normalizedEmail };
    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Helper to parse users defined in environment variables (.env)
function getEnvUsers() {
  const users = [];

  // Single admin: ADMIN_EMAIL & ADMIN_PASSWORD
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    users.push({
      name: process.env.ADMIN_NAME || 'Admin User',
      email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
      password: process.env.ADMIN_PASSWORD
    });
  }

  // Numbered users: USER_1_EMAIL, USER_1_PASSWORD, USER_2_EMAIL, etc.
  for (let i = 1; i <= 25; i++) {
    const emailKey = `USER_${i}_EMAIL`;
    const passKey = `USER_${i}_PASSWORD`;
    const nameKey = `USER_${i}_NAME`;
    if (process.env[emailKey] && process.env[passKey]) {
      users.push({
        name: process.env[nameKey] || `User ${i}`,
        email: process.env[emailKey].trim().toLowerCase(),
        password: process.env[passKey]
      });
    }
  }

  // JSON list: ALLOWED_USERS='[{"name":"Alex","email":"alex@test.com","password":"123"}]'
  if (process.env.ALLOWED_USERS) {
    try {
      const parsed = JSON.parse(process.env.ALLOWED_USERS);
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          if (u.email && u.password) {
            users.push({
              name: u.name || u.email.split('@')[0],
              email: String(u.email).trim().toLowerCase(),
              password: String(u.password)
            });
          }
        }
      }
    } catch (e) {
      console.warn('Warning: Could not parse ALLOWED_USERS JSON in .env:', e.message);
    }
  }

  return users;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const inputEmail = String(email).trim().toLowerCase();

    // 1. Check if matches any user configured in .env
    const envUsers = getEnvUsers();
    const matchedEnvUser = envUsers.find(u => u.email === inputEmail && u.password === password);

    if (matchedEnvUser) {
      const db = getDb();
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(inputEmail);

      // If user doesn't exist in DB yet, create user record automatically
      if (!user) {
        const id = uuidv4();
        const passwordHash = bcrypt.hashSync(matchedEnvUser.password, 10);
        db.prepare(
          'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
        ).run(id, matchedEnvUser.name, inputEmail, passwordHash);
        user = { id, name: matchedEnvUser.name, email: inputEmail };
      }

      const token = generateToken(user);
      return res.json({
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    }

    // 2. Standard database credential verification (fallback)
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(inputEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValidPassword = user.password_hash && bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me - protected
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, target_role, salary_target, target_date, current_focus, created_at FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  try {
    const { email, newPassword } = req.body || {};

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

    res.json({ message: 'Password reset successfully! You can now sign in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Helper to get or create an OAuth user
function getOrCreateOAuthUser(db, { email, name, provider, providerId, avatarUrl }) {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    // Update provider info if needed
    db.prepare('UPDATE users SET provider = ?, provider_id = ?, avatar_url = ? WHERE id = ?')
      .run(provider, providerId, avatarUrl, user.id);
    user.provider = provider;
    user.provider_id = providerId;
    user.avatar_url = avatarUrl;
    return user;
  }

  // Create new user
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, name, email, password_hash, provider, provider_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, email, '', provider, providerId, avatarUrl);

  return {
    id,
    name,
    email,
    provider,
    provider_id: providerId,
    avatar_url: avatarUrl
  };
}

// GET /api/auth/oauth/config
router.get('/oauth/config', (req, res) => {
  res.json({
    google: {
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    },
    github: {
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    }
  });
});

// GET /api/auth/google
router.get('/google', (req, res) => {
  const frontendUrl = getFrontendUrl(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    // If not configured, prompt with helpful guidance
    return res.redirect(`${frontendUrl}/login?oauth_setup=google`);
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account'
    }).toString();

  res.redirect(googleAuthUrl);
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  const frontendUrl = getFrontendUrl(req);
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${frontendUrl}/login?oauth_error=${encodeURIComponent(error || 'access_denied')}`);
  }

  try {
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return res.redirect(`${frontendUrl}/login?oauth_error=token_exchange_failed`);
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const profile = await profileRes.json();
    if (!profile.email) {
      return res.redirect(`${frontendUrl}/login?oauth_error=no_email_provided`);
    }

    const db = getDb();
    const user = getOrCreateOAuthUser(db, {
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      provider: 'google',
      providerId: profile.sub,
      avatarUrl: profile.picture || null
    });

    const token = generateToken(user);
    const userJson = encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url
    }));

    res.redirect(`${frontendUrl}/dashboard/interview/1?token=${token}&user=${userJson}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${frontendUrl}/login?oauth_error=internal_error`);
  }
});

// GET /api/auth/github
router.get('/github', (req, res) => {
  const frontendUrl = getFrontendUrl(req);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/github/callback`;

  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return res.redirect(`${frontendUrl}/login?oauth_setup=github`);
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email'
    }).toString();

  res.redirect(githubAuthUrl);
});

// GET /api/auth/github/callback
router.get('/github/callback', async (req, res) => {
  const frontendUrl = getFrontendUrl(req);
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${frontendUrl}/login?oauth_error=${encodeURIComponent(error || 'access_denied')}`);
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData);
      return res.redirect(`${frontendUrl}/login?oauth_error=token_exchange_failed`);
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'PrepMaster-Pro'
      }
    });

    const ghUser = await userRes.json();
    let email = ghUser.email;

    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'PrepMaster-Pro'
        }
      });
      const emails = await emailsRes.json();
      if (Array.isArray(emails)) {
        const primary = emails.find(e => e.primary && e.verified) || emails[0];
        email = primary?.email;
      }
    }

    if (!email) {
      return res.redirect(`${frontendUrl}/login?oauth_error=no_email_provided`);
    }

    const db = getDb();
    const user = getOrCreateOAuthUser(db, {
      email,
      name: ghUser.name || ghUser.login || email.split('@')[0],
      provider: 'github',
      providerId: String(ghUser.id),
      avatarUrl: ghUser.avatar_url || null
    });

    const token = generateToken(user);
    const userJson = encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url
    }));

    res.redirect(`${frontendUrl}/dashboard/interview/1?token=${token}&user=${userJson}`);
  } catch (err) {
    console.error('GitHub OAuth error:', err);
    res.redirect(`${frontendUrl}/login?oauth_error=internal_error`);
  }
});

// GET /api/auth/oauth/mock/:provider (Instant local developer testing)
router.get('/oauth/mock/:provider', (req, res) => {
  const frontendUrl = getFrontendUrl(req);
  const provider = (req.params.provider || 'google').toLowerCase();

  const mockProfiles = {
    google: {
      email: 'alex.rivera.google@gmail.com',
      name: 'Alex Rivera (Google)',
      provider: 'google',
      providerId: 'google_mock_1029384756',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex'
    },
    github: {
      email: 'sarah.connor.github@gmail.com',
      name: 'Sarah Connor (GitHub)',
      provider: 'github',
      providerId: 'github_mock_987654321',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sarah'
    }
  };

  const profile = mockProfiles[provider] || mockProfiles.google;
  const db = getDb();
  const user = getOrCreateOAuthUser(db, profile);

  const token = generateToken(user);
  const userJson = encodeURIComponent(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url
  }));

  res.redirect(`${frontendUrl}/dashboard/interview/1?token=${token}&user=${userJson}`);
});

module.exports = router;
