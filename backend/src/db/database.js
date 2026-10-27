const path = require('path');
const fs = require('fs');

let dbInstance = null;

class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      users: [],
      progress: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          progress: parsed.progress || []
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database file, initializing empty:', err.message);
      this.data = { users: [], progress: [] };
      this.save();
    }
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  exec(sql) {
    return this;
  }

  pragma(str) {
    return this;
  }

  prepare(sql) {
    const trimmed = sql.trim().replace(/\s+/g, ' ');
    const self = this;

    return {
      get(...params) {
        // SELECT id FROM users WHERE email = ?
        if (trimmed.includes('FROM users') && trimmed.includes('email = ?')) {
          const email = params[0];
          const user = self.data.users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase());
          if (!user) return undefined;
          return { ...user };
        }

        // SELECT ... FROM users WHERE id = ?
        if (trimmed.includes('FROM users') && trimmed.includes('WHERE id = ?')) {
          const id = params[0];
          const user = self.data.users.find(u => u.id === id);
          if (!user) return undefined;
          return { ...user };
        }

        return undefined;
      },

      all(...params) {
        // SELECT section_id, topic_index, field_name, is_completed FROM progress WHERE user_id = ?
        if (trimmed.includes('FROM progress') && trimmed.includes('WHERE user_id = ?') && !trimmed.includes('GROUP BY')) {
          const userId = params[0];
          return self.data.progress
            .filter(p => p.user_id === userId)
            .map(p => ({
              section_id: p.section_id,
              topic_index: p.topic_index,
              field_name: p.field_name,
              is_completed: p.is_completed
            }));
        }

        // Summary: SELECT section_id, COUNT(DISTINCT topic_index) as completed FROM progress WHERE user_id = ? AND field_name = 'done' AND is_completed = 1 GROUP BY section_id
        if (trimmed.includes('COUNT(DISTINCT topic_index)') || (trimmed.includes('FROM progress') && trimmed.includes('GROUP BY section_id'))) {
          const userId = params[0];
          const completedItems = self.data.progress.filter(
            p => p.user_id === userId && p.field_name === 'done' && p.is_completed === 1
          );

          // Group by section_id
          const sectionMap = {};
          for (const item of completedItems) {
            const sKey = String(item.section_id);
            if (!sectionMap[sKey]) {
              sectionMap[sKey] = new Set();
            }
            sectionMap[sKey].add(String(item.topic_index));
          }

          const result = [];
          for (const [secId, topicSet] of Object.entries(sectionMap)) {
            result.push({
              section_id: isNaN(secId) ? secId : Number(secId),
              completed: topicSet.size
            });
          }
          return result;
        }

        return [];
      },

      run(...params) {
        // INSERT INTO users
        if (trimmed.startsWith('INSERT INTO users')) {
          const [id, name, email, passwordHash, provider, providerId, avatarUrl] = params;
          const newUser = {
            id,
            name: name || '',
            email: email || '',
            password_hash: passwordHash || '',
            provider: provider || 'local',
            provider_id: providerId || null,
            avatar_url: avatarUrl || null,
            target_role: '',
            salary_target: '',
            target_date: '',
            current_focus: '',
            personal_notes: '',
            created_at: new Date().toISOString()
          };
          self.data.users.push(newUser);
          self.save();
          return { changes: 1 };
        }

        // UPDATE users provider & avatar
        if (trimmed.includes('UPDATE users') && trimmed.includes('provider = ?')) {
          const [provider, providerId, avatarUrl, userId] = params;
          const user = self.data.users.find(u => u.id === userId);
          if (user) {
            user.provider = provider;
            user.provider_id = providerId;
            if (avatarUrl) user.avatar_url = avatarUrl;
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // UPDATE users password_hash
        if (trimmed.includes('UPDATE users') && trimmed.includes('password_hash = ?')) {
          const [passwordHash, userId] = params;
          const user = self.data.users.find(u => u.id === userId);
          if (user) {
            user.password_hash = passwordHash;
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // UPDATE users (profile & target)
        if (trimmed.startsWith('UPDATE users')) {
          // targetRole, salaryTarget, targetDate, currentFocus, personalNotes, userId
          const [targetRole, salaryTarget, targetDate, currentFocus, personalNotes, userId] = params;
          // In case 5 or 6 params passed:
          const actualUserId = userId !== undefined ? userId : personalNotes;
          const user = self.data.users.find(u => u.id === actualUserId);
          if (user) {
            user.target_role = targetRole || '';
            user.salary_target = salaryTarget || '';
            user.target_date = targetDate || '';
            user.current_focus = currentFocus || '';
            if (userId !== undefined) {
              user.personal_notes = personalNotes || '';
            }
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // INSERT INTO progress ... ON CONFLICT ... DO UPDATE
        if (trimmed.startsWith('INSERT INTO progress')) {
          const [userId, sectionId, topicIndex, fieldName, isCompleted] = params;
          const existing = self.data.progress.find(
            p => p.user_id === userId &&
                 String(p.section_id) === String(sectionId) &&
                 String(p.topic_index) === String(topicIndex) &&
                 p.field_name === fieldName
          );

          if (existing) {
            existing.is_completed = Number(isCompleted);
            existing.updated_at = new Date().toISOString();
          } else {
            self.data.progress.push({
              id: self.data.progress.length + 1,
              user_id: userId,
              section_id: isNaN(sectionId) ? String(sectionId) : Number(sectionId),
              topic_index: isNaN(topicIndex) ? String(topicIndex) : Number(topicIndex),
              field_name: fieldName,
              is_completed: Number(isCompleted),
              updated_at: new Date().toISOString()
            });
          }

          self.save();
          return { changes: 1 };
        }

        return { changes: 0 };
      }
    };
  }
}

function getDb() {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'tracker.json');
  dbInstance = new JsonDatabase(dbPath);
  return dbInstance;
}

module.exports = { getDb };
