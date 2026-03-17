require('dotenv').config();
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
    staleness_score INTEGER,
    size_score INTEGER,
    priority_score INTEGER,
    fetched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(repo_name, pr_number)
);`;

pool.query(sql)
  .then(() => { console.log("✅ Table created!"); process.exit(); })
  .catch((err) => { console.error("❌ DB Error:", err); process.exit(); });