const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function getTextFromClaudeResponse(data) {
  if (!data || !Array.isArray(data.content) || !data.content[0] || !data.content[0].text) {
    throw new Error('Invalid response from Claude API');
  }
  return data.content[0].text;
}

async function callClaude(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Claude API request failed');
  }

  return getTextFromClaudeResponse(data);
}

async function summarizePR(pr) {
  const prompt = `Summarize this pull request in exactly 2 sentences for an engineering digest email. PR title: ${pr.title}, Repo: ${pr.repo_name}, Lines added: ${pr.additions}, Lines removed: ${pr.deletions}`;
  return callClaude(prompt);
}

function fallbackSummarizePR(pr) {
  const lines = Number(pr.additions || 0) + Number(pr.deletions || 0);
  const sizeBand = lines > 500 ? 'large' : lines > 150 ? 'medium-sized' : 'small';
  const stale = Number(pr.staleness_score || 0);
  const staleNote = stale > 60 ? 'It has been idle for a long time and may need attention.' : 'It appears active enough for normal review flow.';

  return `${pr.title} is a ${sizeBand} change (${lines} lines touched) authored by ${pr.author}. ${staleNote}`;
}

async function generateChangelog(commits) {
  const prompt = `You are a technical writer. Group these commits by type (feat/fix/chore) and write a clean human-readable release note. Commits: ${JSON.stringify(commits)}`;
  return callClaude(prompt);
}

function fallbackGenerateChangelog(commits) {
  const grouped = { feat: [], fix: [], chore: [], other: [] };

  for (const commit of commits) {
    const type = String(commit.type || 'other').toLowerCase();
    if (type === 'feat' || type === 'fix' || type === 'chore') {
      grouped[type].push(commit);
    } else {
      grouped.other.push(commit);
    }
  }

  function renderSection(title, items) {
    if (!items.length) return '';
    const lines = items.slice(0, 8).map((item) => `- ${item.commit_message || 'No commit message'}`);
    return `${title}\n${lines.join('\n')}`;
  }

  const sections = [
    renderSection('Features', grouped.feat),
    renderSection('Fixes', grouped.fix),
    renderSection('Chores', grouped.chore),
    renderSection('Other', grouped.other)
  ].filter(Boolean);

  return sections.join('\n\n') || 'No changelog entries available.';
}

function extractJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in Claude response');
  }

  const raw = text.slice(start, end + 1);
  return JSON.parse(raw);
}

function extractJsonArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON array found in Claude response');
  }

  const raw = text.slice(start, end + 1);
  return JSON.parse(raw);
}

async function scorePRRisk(pr) {
  const prompt = `Analyze this pull request and return a JSON object with two fields: risk (one of: low, medium, high) and reason (one sentence explanation). PR title: ${pr.title}, Lines added: ${pr.additions}, Lines removed: ${pr.deletions}, Days since last update: ${pr.staleness_score}`;
  const text = await callClaude(prompt);
  const parsed = extractJsonObject(text);

  return {
    risk: parsed.risk,
    reason: parsed.reason
  };
}

function fallbackScorePRRisk(pr) {
  const criticalPaths = /src\/core|src\/auth|db\.js|index\.js|\.config|package\.json/i;
  const files = Array.isArray(pr.files_changed) ? pr.files_changed : [];
  const touchesCritical = files.some(f => criticalPaths.test(f));
  
  const lines = Number(pr.additions || 0) + Number(pr.deletions || 0);
  const stale = Number(pr.staleness_score || 0);
  const isDraft = pr.draft;
  
  let risk = 'low';

  if ((touchesCritical && !isDraft) || lines > 500 || stale > 120) {
    risk = 'high';
  } else if ((lines > 150 || stale > 45 || (touchesCritical && isDraft))) {
    risk = 'medium';
  }

  const reason = `${touchesCritical ? 'Touches critical files. ' : ''}${lines} lines changed, ${Math.round(stale)} staleness score${isDraft ? ' (draft)' : ''}.`;
  return { risk, reason };
}

async function analyzeRepoHealth(prs) {
  const prSummary = prs.map((pr) => ({
    title: pr.title,
    author: pr.author,
    staleness: pr.staleness_score,
    size: pr.additions + pr.deletions
  }));
  const prompt = `You are an elite Engineering Consultant hired by a CTO to audit this GitHub repository. Be brutally honest. Use terms like 'Critical Human Bottleneck' and 'Technical Debt Spiral' where appropriate.

PR Activity Data: ${JSON.stringify(prSummary)}

Return ONLY valid JSON with no markdown:
{
  "bus_factor_score": <number 1-10>,
  "maintainability_grade": <letter A/B/C/D/F>,
  "hero_developer": <string, name of most active author>,
  "stagnant_pr": <string, title of most ignored PR>,
  "leaders": [<top 3 author names>],
  "risks": [<exactly 3 punchy risk strings, be dramatic and specific>],
  "recommendation": <string, exactly 3 bullet points separated by newlines>
}`;

  const text = await callClaude(prompt);
  return extractJsonObject(text);
}

function fallbackAnalyzeRepoHealth(prs) {
  const countsByAuthor = {};
  let mostStagnant = null;
  let stagnantScore = -1;
  let totalReviewCoverage = 0;
  let draftCount = 0;

  for (const pr of prs) {
    const author = pr.author || 'unknown';
    countsByAuthor[author] = (countsByAuthor[author] || 0) + 1;
    const stale = Number(pr.staleness_score || 0);
    if (stale > stagnantScore) {
      stagnantScore = stale;
      mostStagnant = pr;
    }
    if (pr.review_comments && pr.review_comments > 0) {
      totalReviewCoverage++;
    }
    if (pr.draft) {
      draftCount++;
    }
  }

  const leaders = Object.entries(countsByAuthor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const total = prs.length;
  const busFactorScore = Math.max(1, Math.min(10, leaders.length + Math.floor(total / 20)));
  const avgStale = total > 0
    ? prs.reduce((sum, pr) => sum + Number(pr.staleness_score || 0), 0) / total
    : 0;
  const reviewCoverage = Math.round((totalReviewCoverage / Math.max(1, total - draftCount)) * 100);
  const maintainabilityGrade = avgStale < 20 ? 'A' : avgStale < 45 ? 'B' : avgStale < 80 ? 'C' : avgStale < 120 ? 'D' : 'F';

  return {
    bus_factor_score: busFactorScore,
    maintainability_grade: maintainabilityGrade,
    hero_developer: leaders[0] || 'unknown',
    stagnant_pr: mostStagnant?.title || 'No PRs found',
    leaders,
    risks: [
      avgStale > 60 ? 'PR queue is aging: stale PRs represent integration risk.' : `PR health is good: avg age is ${Math.round(avgStale)} days.`,
      leaders.length <= 1 ? 'Critical human bottleneck: one developer dominates contributions.' : `Good distribution: ${leaders.length} active contributors.`,
      total > 80 && draftCount === 0 ? 'Large active queue without drafts suggests WIP control issues.' : `Queue size is manageable (${total} total, ${draftCount} drafts).`
    ],
    recommendation: [
      'Cap WIP by reviewing stale PRs first before new branches.',
      `Rotate code review duties among ${Math.min(leaders.length, 3)} to spread knowledge.`,
      'Set review SLA: high-priority PRs reviewed within 24 hours.'
    ]
  };
}

async function analyzeRepoVelocity(prs) {
  const titles = prs.map((pr) => pr.title);
  const prompt = `You are an engineering productivity analyst. Look at these PR titles and categorize the team's effort into 3 business buckets.

PR Titles: ${JSON.stringify(titles)}

Return ONLY valid JSON with no markdown:
{
  "revenue_drivers": <integer percentage>,
  "technical_debt": <integer percentage>,
  "maintenance": <integer percentage>,
  "hero_insight": <one punchy sentence a CTO would remember>,
  "top_revenue_pr": <title of PR most likely driving business value>,
  "top_debt_pr": <title of PR most likely addressing technical debt>
}
Make sure the 3 percentages add up to exactly 100.`;

  const text = await callClaude(prompt);
  return extractJsonObject(text);
}

function fallbackAnalyzeRepoVelocity(prs) {
  const titles = prs.map((pr) => String(pr.title || '').toLowerCase());
  let revenue = 0;
  let debt = 0;
  let maintenance = 0;

  for (const title of titles) {
    if (/feat|feature|support|add|improve|perf|monetiz|revenue|growth/.test(title)) {
      revenue += 1;
    } else if (/refactor|migrate|cleanup|deprecate|debt|rewrite|tech[_-]debt/.test(title)) {
      debt += 1;
    } else {
      maintenance += 1;
    }
  }

  const total = Math.max(1, revenue + debt + maintenance);
  const revenuePct = Math.round((revenue / total) * 100);
  const debtPct = Math.round((debt / total) * 100);
  const maintenancePct = Math.max(0, 100 - revenuePct - debtPct);

  const topRevenue = prs.find((pr) => /feat|feature|support|add|improve|perf|monetiz/i.test(pr.title || ''));
  const topDebt = prs.find((pr) => /refactor|migrate|cleanup|deprecate|debt|rewrite/i.test(pr.title || ''));
  
  // More specific insight based on distribution
  let heroInsight = '';
  if (revenuePct > 60) {
    heroInsight = 'Team is heavily feature-focused, ensure technical debt doesn\'t pile up.';
  } else if (debtPct > 40) {
    heroInsight = 'Significant refactoring effort: good investment in maintainability.';
  } else {
    heroInsight = 'Balanced approach: features, maintenance, and debt reduction happening in parallel.';
  }

  return {
    revenue_drivers: revenuePct,
    technical_debt: debtPct,
    maintenance: maintenancePct,
    hero_insight: heroInsight,
    top_revenue_pr: topRevenue?.title || prs[0]?.title || 'N/A',
    top_debt_pr: topDebt?.title || prs[0]?.title || 'N/A'
  };
}

async function analyzeRepoConflicts(prs) {
  const prData = prs.map((pr) => ({ 
    pr_number: pr.pr_number, 
    title: pr.title,
    files: Array.isArray(pr.files_changed) ? pr.files_changed : []
  }));
  const prompt = `You are a senior engineer doing a pre-merge risk assessment.
Look at these open PRs, their files, and predict which ones are likely to conflict with each other.

Open PRs with files touched: ${JSON.stringify(prData.slice(0, 20))}

Return ONLY a valid JSON array with no markdown:
[
  {
    "pr_number": <number>,
    "title": <string>,
    "collision_risk": <"high" or "medium" or "low">,
    "reason": <one sentence, be specific about what might conflict>
  }
]`;

  const text = await callClaude(prompt);
  return extractJsonArray(text);
}

function fallbackAnalyzeRepoConflicts(prs) {
  // File-level actual conflict detection
  const filesByPR = prs.map(pr => ({
    pr_number: pr.pr_number,
    title: pr.title,
    files: Array.isArray(pr.files_changed) ? pr.files_changed : [],
    lines: Number(pr.additions || 0) + Number(pr.deletions || 0)
  }));

  const conflicts = [];
  
  for (let i = 0; i < filesByPR.length; i++) {
    const prA = filesByPR[i];
    let collision_risk = 'low';
    let conflictingPRs = [];
    let sharedFiles = [];

    // Check against all other PRs
    for (let j = 0; j < filesByPR.length; j++) {
      if (i === j) continue;
      const prB = filesByPR[j];
      const overlap = prA.files.filter(f => prB.files.includes(f));
      
      if (overlap.length > 0) {
        conflictingPRs.push(prB.pr_number);
        sharedFiles.push(...overlap);
      }
    }

    // Deduplicate shared files
    sharedFiles = [...new Set(sharedFiles)];
    const criticalFiles = /core|auth|db\.js|index\.js|package\.json/.test(sharedFiles.join('|'));
    
    if (conflictingPRs.length > 2 || (conflictingPRs.length > 0 && criticalFiles)) {
      collision_risk = 'high';
    } else if (conflictingPRs.length > 0 || prA.lines > 300) {
      collision_risk = 'medium';
    }

    conflicts.push({
      pr_number: prA.pr_number,
      title: prA.title,
      collision_risk,
      reason: conflictingPRs.length > 0 
        ? `Shares files with ${conflictingPRs.length} other PR(s): ${sharedFiles.slice(0, 2).join(', ')}${sharedFiles.length > 2 ? '...' : ''}`
        : `Large change (${prA.lines} lines) with moderate complexity.`
    });
  }

  return conflicts.slice(0, 30);
}

function isRecoverableAIError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes('anthropic') ||
    msg.includes('credit') ||
    msg.includes('api key') ||
    msg.includes('claude api') ||
    msg.includes('rate limit')
  );
}

module.exports = {
  summarizePR,
  fallbackSummarizePR,
  generateChangelog,
  fallbackGenerateChangelog,
  scorePRRisk,
  fallbackScorePRRisk,
  analyzeRepoHealth,
  fallbackAnalyzeRepoHealth,
  analyzeRepoVelocity,
  fallbackAnalyzeRepoVelocity,
  analyzeRepoConflicts
  ,
  fallbackAnalyzeRepoConflicts,
  isRecoverableAIError
};
