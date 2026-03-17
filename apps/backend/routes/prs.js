const express = require('express');
const router = express.Router();
const pool = require('../db');
const { fetchOpenPRsForRepo } = require('../services/github');
const { scorePR } = require('../services/scoring');

// GET: Fetch scored PRs from DB
router.get('/', async (req, res) => {
  const { repo } = req.query;
  try {
    let query = 'SELECT * FROM pull_requests';
    let params = [];
    
    if (repo) {
      query += ' WHERE repo_name = $1';
      params.push(repo);
    }
    
    query += ' ORDER BY priority_score DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Trigger refresh for a specific repo
router.post('/refresh', async (req, res) => {
  const { repo } = req.body;
  if (!repo) return res.status(400).json({ error: 'Repo required' });

  try {
    const rawPRs = await fetchOpenPRsForRepo(repo);
    const scoredPRs = rawPRs.map(scorePR);

    for (const pr of scoredPRs) {
      await pool.query(
        `INSERT INTO pull_requests (repo_name, pr_number, title, author, created_at, updated_at, additions, deletions, staleness_score, size_score, priority_score, fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (repo_name, pr_number) DO UPDATE SET
         priority_score = EXCLUDED.priority_score, updated_at = EXCLUDED.updated_at`,
        [pr.repo_name, pr.pr_number, pr.title, pr.author, pr.created_at, pr.updated_at, pr.additions, pr.deletions, pr.staleness_score, pr.size_score, pr.priority_score]
      );
    }

    res.json({ success: true, count: scoredPRs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;