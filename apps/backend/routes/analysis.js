const express = require('express');
const pool = require('../db');
const { normalizeRepoInput, isRepoValidationError } = require('../utils/repo');
const {
  analyzeRepoHealth,
  fallbackAnalyzeRepoHealth,
  analyzeRepoVelocity,
  fallbackAnalyzeRepoVelocity,
  analyzeRepoConflicts,
  fallbackAnalyzeRepoConflicts,
  isRecoverableAIError
} = require('../services/ai');

const router = express.Router();

router.get('/health/:repo', async (req, res) => {
  try {
    const repo = normalizeRepoInput(req.params.repo);
    const result = await pool.query(
      'SELECT * FROM pull_requests WHERE repo_name = $1 ORDER BY fetched_at DESC LIMIT 50',
      [repo]
    );

    if (result.rows.length === 0) {
      return res.json({ no_data: true });
    }

    try {
      const analysis = await analyzeRepoHealth(result.rows);
      res.json({ ...analysis, degraded_mode: false });
    } catch (aiError) {
      if (!isRecoverableAIError(aiError)) {
        throw aiError;
      }
      const fallback = fallbackAnalyzeRepoHealth(result.rows);
      res.json({ ...fallback, degraded_mode: true });
    }
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/velocity/:repo', async (req, res) => {
  try {
    const repo = normalizeRepoInput(req.params.repo);
    const result = await pool.query(
      'SELECT * FROM pull_requests WHERE repo_name = $1 ORDER BY fetched_at DESC LIMIT 50',
      [repo]
    );

    if (result.rows.length === 0) {
      return res.json({ no_data: true });
    }

    try {
      const analysis = await analyzeRepoVelocity(result.rows);
      res.json({ ...analysis, degraded_mode: false });
    } catch (aiError) {
      if (!isRecoverableAIError(aiError)) {
        throw aiError;
      }
      const fallback = fallbackAnalyzeRepoVelocity(result.rows);
      res.json({ ...fallback, degraded_mode: true });
    }
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/conflicts/:repo', async (req, res) => {
  try {
    const repo = normalizeRepoInput(req.params.repo);
    const result = await pool.query(
      'SELECT * FROM pull_requests WHERE repo_name = $1 ORDER BY fetched_at DESC',
      [repo]
    );

    if (result.rows.length === 0) {
      return res.json([]);
    }

    try {
      const analysis = await analyzeRepoConflicts(result.rows);
      if (Array.isArray(analysis)) {
        return res.json(analysis.map((item) => ({ ...item, degraded_mode: false })));
      }
      return res.json([]);
    } catch (aiError) {
      if (!isRecoverableAIError(aiError)) {
        throw aiError;
      }
      const fallback = fallbackAnalyzeRepoConflicts(result.rows);
      res.json(fallback.map((item) => ({ ...item, degraded_mode: true })));
    }
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
