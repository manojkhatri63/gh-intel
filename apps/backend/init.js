const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./db');
const sql = `CREATE TABLE IF NOT EXISTS pull_requests (
    id SERIAL PRIMARY KEY,
    repo_name TEXT,
    pr_number INTEGER,
    title TEXT,
    author TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    additions INTEGER,
    deletions INTEGER,
    files_changed JSONB DEFAULT '[]',
    review_comments INTEGER DEFAULT 0,
    commits_count INTEGER DEFAULT 0,
    draft BOOLEAN DEFAULT FALSE,
    staleness_score INTEGER,
    size_score INTEGER,
    priority_score INTEGER,
    risk_score TEXT DEFAULT 'low',
    fetched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(repo_name, pr_number)
);`;

pool.query(sql)
  .then(() => { console.log("✅ Table created!"); process.exit(); })
  .catch((err) => { console.error("❌ DB Error:", err); process.exit(); });