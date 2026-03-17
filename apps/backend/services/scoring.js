function scorePR(pr) {
  const now = new Date();
  const created = new Date(pr.created_at);
  const diffInMs = now.getTime() - created.getTime();
  const daysOld = Math.max(0, diffInMs / (1000 * 60 * 60 * 24));

  // Staleness: 100% reached at 30 days old
  // Formula: (days / 30) * 100
  const staleness_score = Math.min(Math.round((daysOld / 30) * 100), 100);

  // Size: 100% reached at 500 lines changed
  const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
  const size_score = Math.min(Math.round((totalChanges / 500) * 100), 100);

  // Priority: Average of the two (Both are now 0-100, so result is 0-100)
  const priority_score = Math.round((staleness_score + size_score) / 2);

  return { 
    ...pr, 
    staleness_score, 
    size_score, 
    priority_score 
  };
}

module.exports = { scorePR };
