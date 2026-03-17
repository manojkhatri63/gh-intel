function scorePR(pr) {
  const now = new Date();
  const created = new Date(pr.created_at);
  const daysOld = (now - created) / (1000 * 60 * 60 * 24);

  // Staleness: 10 points per day old (max 100)
  const staleness_score = Math.min(Math.floor(daysOld * 10), 100);

  // Size: 1 point per 10 lines changed (max 100)
  const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
  const size_score = Math.min(Math.floor(totalChanges / 10), 100);

  // Priority: Weighted average
  const priority_score = Math.floor((staleness_score * 0.7) + (size_score * 0.3));

  return { ...pr, staleness_score, size_score, priority_score };
}

module.exports = { scorePR };