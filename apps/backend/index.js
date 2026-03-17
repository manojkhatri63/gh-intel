require('dotenv').config();

const express = require('express');
const cors = require('cors');
const prsRoutes = require('./routes/prs');
const changelogRoutes = require('./routes/changelog');
const webhookRoutes = require('./routes/webhook');
const analysisRouter = require('./routes/analysis');
const pool = require('./db');
const {
  summarizePR,
  fallbackSummarizePR,
  generateChangelog,
  fallbackGenerateChangelog,
  scorePRRisk,
  fallbackScorePRRisk,
  isRecoverableAIError
} = require('./services/ai');
const { normalizeRepoInput, isRepoValidationError } = require('./utils/repo');

const app = express();

// 1. Enable CORS so the Frontend (Port 3000) can talk to us
app.use(cors());

// 2. Webhook route with raw middleware (Must stay BEFORE express.json)
app.use('/api/webhook', webhookRoutes);

// 3. CRITICAL: Move JSON middleware ABOVE your standard routes
// This allows req.body to be populated for /api/prs/refresh
app.use(express.json());

// 4. Standard Routes
app.use('/api/prs', prsRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/analysis', analysisRouter);

// --- AI & Logic Routes ---

app.post('/api/prs/summarize', async (req, res) => {
  try {
    const repo = req.body?.repo ? normalizeRepoInput(req.body.repo) : null;
    let query = 'SELECT * FROM pull_requests';
    const params = [];

    if (repo) {
      query += ' WHERE repo_name = $1';
      params.push(repo);
    }

    query += ' ORDER BY priority_score DESC';

    const result = await pool.query(query, params);
    const summaries = await Promise.all(
      result.rows.map(async (pr) => {
        let summary = '';
        let degradedMode = false;
        try {
          summary = await summarizePR(pr);
        } catch (aiError) {
          if (!isRecoverableAIError(aiError)) {
            throw aiError;
          }
          summary = fallbackSummarizePR(pr);
          degradedMode = true;
        }
        return {
          pr_number: pr.pr_number,
          repo_name: pr.repo_name,
          title: pr.title,
          summary,
          degraded_mode: degradedMode
        };
      })
    );
    res.json(summaries);
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

app.post('/api/changelog/generate', async (req, res) => {
  try {
    const repoInput = req.body?.repo ?? req.query?.repo;
    const repo = repoInput ? normalizeRepoInput(repoInput) : null;
    let query = 'SELECT commit_message, type, author FROM changelog_entries';
    const params = [];

    if (repo) {
      query += ' WHERE repo_name = $1';
      params.push(repo);
    }

    query += ' ORDER BY committed_at DESC LIMIT 20';

    const result = await pool.query(query, params);
    let entries = result.rows;

    if (entries.length === 0) {
      let prsQuery = 'SELECT title, author FROM pull_requests';
      const prsParams = [];
      if (repo) {
        prsQuery += ' WHERE repo_name = $1';
        prsParams.push(repo);
      }
      prsQuery += ' ORDER BY fetched_at DESC LIMIT 20';

      const prsResult = await pool.query(prsQuery, prsParams);

      const inferType = (title) => {
        const text = String(title || '').toLowerCase();
        if (/^feat\b|feature|add|support|introduce|enhance/.test(text)) return 'feat';
        if (/^fix\b|bug|patch|correct|hotfix/.test(text)) return 'fix';
        if (/^chore\b|deps|ci|build|docs/.test(text)) return 'chore';
        return 'other';
      };

      entries = prsResult.rows.map((pr) => ({
        commit_message: pr.title,
        type: inferType(pr.title),
        author: pr.author
      }));

      if (entries.length === 0) {
        return res.status(404).json({ error: 'No changelog entries or pull request data found for this repository.' });
      }
    }

    try {
      const changelog = await generateChangelog(entries);
      res.json({ changelog, degraded_mode: false });
    } catch (aiError) {
      if (!isRecoverableAIError(aiError)) {
        throw aiError;
      }
      const changelog = fallbackGenerateChangelog(entries);
      res.json({ changelog, degraded_mode: true });
    }
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

app.post('/api/prs/risk', async (req, res) => {
  try {
    const repo = req.body?.repo ? normalizeRepoInput(req.body.repo) : null;
    let query = 'SELECT * FROM pull_requests';
    const params = [];
    if (repo) {
      query += ' WHERE repo_name = $1';
      params.push(repo);
    }
    query += ' ORDER BY priority_score DESC';
    const result = await pool.query(query, params);
    const risks = await Promise.all(
      result.rows.map(async (pr) => {
        let riskData;
        let degradedMode = false;
        try {
          riskData = await scorePRRisk(pr);
        } catch (aiError) {
          if (!isRecoverableAIError(aiError)) {
            throw aiError;
          }
          riskData = fallbackScorePRRisk(pr);
          degradedMode = true;
        }
        return {
          pr_number: pr.pr_number,
          repo_name: pr.repo_name,
          title: pr.title,
          risk: riskData.risk,
          reason: riskData.reason,
          degraded_mode: degradedMode
        };
      })
    );
    res.json(risks);
  } catch (error) {
    const status = isRepoValidationError(error) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;