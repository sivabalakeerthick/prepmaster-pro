const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dataFilePath = path.join(__dirname, 'data', 'tracker.json');

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('\n=== PrepMaster Pro - Create / Update User ===');
  console.log('Usage: node create-user.js "<Full Name>" "<Email>" "<Password>"');
  console.log('Example: node create-user.js "Siva Bala" "sivabalakeerthick@gmail.com" "mypassword123"\n');
  process.exit(1);
}

const [name, email, password] = args;

if (!email || !email.includes('@')) {
  console.error('Error: Please provide a valid email address.');
  process.exit(1);
}

if (!password || password.length < 6) {
  console.error('Error: Password must be at least 6 characters long.');
  process.exit(1);
}

// Load database file
let db = { users: [], progress: [] };
if (fs.existsSync(dataFilePath)) {
  try {
    db = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  } catch (err) {
    console.error('Error reading tracker.json:', err.message);
  }
}

if (!Array.isArray(db.users)) {
  db.users = [];
}

const passwordHash = bcrypt.hashSync(password, 10);
const existingIndex = db.users.findIndex(u => (u.email || '').toLowerCase() === email.toLowerCase());

if (existingIndex >= 0) {
  db.users[existingIndex].name = name;
  db.users[existingIndex].password_hash = passwordHash;
  console.log(`\n✅ Updated existing user: "${email}"`);
} else {
  const newUser = {
    id: uuidv4(),
    name,
    email,
    password_hash: passwordHash,
    provider: 'local',
    provider_id: null,
    avatar_url: null,
    target_role: '',
    salary_target: '',
    target_date: '',
    current_focus: '',
    personal_notes: '',
    created_at: new Date().toISOString()
  };
  db.users.push(newUser);
  console.log(`\n🎉 Created new user: "${email}" (ID: ${newUser.id})`);
}

// Ensure directory exists & save
fs.writeFileSync(dataFilePath, JSON.stringify(db, null, 2), 'utf8');

console.log('----------------------------------------------------');
console.log('Credential Details for Sign In:');
console.log(`Email:    ${email}`);
console.log(`Password: ${password}`);
console.log(`Sign In:  http://localhost:3000/login`);
console.log('----------------------------------------------------\n');
