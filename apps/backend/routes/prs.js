const express = require('express');
const { fetchOpenPRsForRepo, searchRepositories } = require('../services/github');
const { scorePR } = require('../services/scoring');
const pool = require('../db');
const { normalizeRepoInput, isRepoValidationError } = require('../utils/repo');

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const results = await searchRepositories(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to search repositories.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const repo = req.query.repo ? normalizeRepoInput(req.query.repo) : null;
    let query = 'SELECT * FROM pull_requests';
    const params = [];

    if (repo) {
      query += ' WHERE repo_name = $1';
      params.push(repo);
    }

    query += ' ORDER BY priority_score DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const repo = normalizeRepoInput(req.body?.repo);

    const prs = await fetchOpenPRsForRepo(repo);
    const scoredPRs = prs.map(scorePR);

    let count = 0;
    for (const pr of scoredPRs) {
      const now = new Date();
      await pool.query(
        `INSERT INTO pull_requests (repo_name, pr_number, title, author, created_at, updated_at, additions, deletions, staleness_score, size_score, priority_score, fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (repo_name, pr_number) DO UPDATE SET
         title = $3, author = $4, created_at = $5, updated_at = $6,
         additions = $7, deletions = $8, staleness_score = $9,
         size_score = $10, priority_score = $11, fetched_at = $12`,
        [pr.repo_name, pr.pr_number, pr.title, pr.author, pr.created_at, pr.updated_at,
         pr.additions, pr.deletions, pr.staleness_score, pr.size_score, pr.priority_score, now]
      );
      count++;
    }

    res.json({ success: true, count, repo });
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;