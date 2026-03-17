const express = require('express');
const crypto = require('crypto');
const { fetchOpenPRsForRepo } = require('../services/github');
const { scorePR } = require('../services/scoring');
const pool = require('../db');

const router = express.Router();

function verifySignature(req) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if no secret configured

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.body);
  const digest = `sha256=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!verifySignature(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    let payload;
    try {
      payload = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const event = req.headers['x-github-event'];
    const repoFullName = payload?.repository?.full_name;

    if (!repoFullName) {
      return res.status(200).json({ received: true });
    }

    if (event === 'pull_request' || event === 'push') {
      try {
        const prs = await fetchOpenPRsForRepo(repoFullName);
        const scoredPRs = prs.map(scorePR);

        for (const pr of scoredPRs) {
          const now = new Date();
          await pool.query(
            `INSERT INTO pull_requests (repo_name, pr_number, title, author, created_at, updated_at, additions, deletions, files_changed, review_comments, commits_count, draft, staleness_score, size_score, priority_score, risk_score, fetched_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             ON CONFLICT (repo_name, pr_number) DO UPDATE SET
             title = $3, author = $4, created_at = $5, updated_at = $6,
             additions = $7, deletions = $8, files_changed = $9, review_comments = $10,
             commits_count = $11, draft = $12, staleness_score = $13,
             size_score = $14, priority_score = $15, risk_score = $16, fetched_at = $17`,
            [pr.repo_name, pr.pr_number, pr.title, pr.author, pr.created_at, pr.updated_at,
             pr.additions, pr.deletions, JSON.stringify(pr.files_changed || []), pr.review_comments || 0,
             pr.commits_count || 0, pr.draft || false, pr.staleness_score, pr.size_score, 
             pr.priority_score, pr.risk_score || 'low', now]
          );
        }
      } catch {
        // best-effort refresh; don't fail the webhook response
      }
    }

    res.status(200).json({ received: true });
  }
);

module.exports = router;
