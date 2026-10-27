const express = require('express');
const { getDb } = require('../db/database');
const authMiddleware = require('../middleware/auth');
const interviewSections = require('../data/interviewTopics.json');
const dsaData = require('../data/dsaTopics.json');

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

// GET /api/progress - Get all progress for current user
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT section_id, topic_index, field_name, is_completed FROM progress WHERE user_id = ?'
    ).all(req.user.id);

    const progress = {};
    for (const row of rows) {
      const key = `${row.section_id}-${row.topic_index}-${row.field_name}`;
      progress[key] = row.is_completed === 1;
    }

    res.json({ progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/progress - Update a single progress item
router.put('/', (req, res) => {
  try {
    const { sectionId, topicIndex, fieldName, isCompleted } = req.body || {};

    if (sectionId === undefined || topicIndex === undefined || !fieldName || isCompleted === undefined) {
      return res.status(400).json({ error: 'sectionId, topicIndex, fieldName, and isCompleted are required.' });
    }

    const db = getDb();
    const completed = isCompleted ? 1 : 0;

    db.prepare(`
      INSERT INTO progress (user_id, section_id, topic_index, field_name, is_completed, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, section_id, topic_index, field_name)
      DO UPDATE SET is_completed = ?, updated_at = datetime('now')
    `).run(req.user.id, sectionId, topicIndex, fieldName, completed, completed);

    res.json({
      message: 'Progress updated.',
      key: `${sectionId}-${topicIndex}-${fieldName}`,
      isCompleted: !!isCompleted
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/progress/summary - Get completion counts per section
router.get('/summary', (req, res) => {
  try {
    const db = getDb();

    const summaryRows = db.prepare(`
      SELECT section_id, COUNT(DISTINCT topic_index) as completed
      FROM progress
      WHERE user_id = ? AND field_name = 'done' AND is_completed = 1
      GROUP BY section_id
    `).all(req.user.id);

    const completedMap = {};
    for (const row of summaryRows) {
      completedMap[String(row.section_id)] = row.completed;
    }

    const interviewSummary = interviewSections.map(section => ({
      sectionId: section.id,
      total: section.topics.length,
      completed: completedMap[String(section.id)] || 0
    }));

    const dsaSummary = (dsaData.sections || []).map(section => ({
      sectionId: `dsa_${section.id}`,
      total: section.exercises.length,
      completed: completedMap[`dsa_${section.id}`] || 0
    }));

    const combinedSummary = [...interviewSummary, ...dsaSummary];

    res.json({
      summary: combinedSummary,
      interviewSummary,
      dsaSummary
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
