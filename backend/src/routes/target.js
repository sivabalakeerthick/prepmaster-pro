const express = require('express');
const { getDb } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

// GET /api/target - Get user's target info
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT target_role, salary_target, target_date, current_focus, personal_notes FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      targetRole: user.target_role || '',
      salaryTarget: user.salary_target || '',
      targetDate: user.target_date || '',
      currentFocus: user.current_focus || '',
      personalNotes: user.personal_notes || ''
    });
  } catch (error) {
    console.error('Get target error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/target - Update target info
router.put('/', (req, res) => {
  try {
    const { targetRole, salaryTarget, targetDate, currentFocus, personalNotes } = req.body || {};

    const db = getDb();
    db.prepare(`
      UPDATE users 
      SET target_role = ?, salary_target = ?, target_date = ?, current_focus = ?, personal_notes = ?
      WHERE id = ?
    `).run(
      targetRole || '',
      salaryTarget || '',
      targetDate || '',
      currentFocus || '',
      personalNotes || '',
      req.user.id
    );

    res.json({
      message: 'Target updated.',
      targetRole: targetRole || '',
      salaryTarget: salaryTarget || '',
      targetDate: targetDate || '',
      currentFocus: currentFocus || '',
      personalNotes: personalNotes || ''
    });
  } catch (error) {
    console.error('Update target error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
