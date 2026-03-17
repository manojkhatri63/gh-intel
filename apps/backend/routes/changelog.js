const express = require('express');
const pool = require('../db');
const { normalizeRepoInput, isRepoValidationError } = require('../utils/repo');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const repo = req.query.repo ? normalizeRepoInput(req.query.repo) : null;
    let query = 'SELECT * FROM changelog_entries';
    const params = [];

    if (repo) {
      query += ' WHERE repo_name = $1';
      params.push(repo);
    }

    query += ' ORDER BY committed_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
