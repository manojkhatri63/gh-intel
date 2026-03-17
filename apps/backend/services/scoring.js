function scorePR(pr) {
  const now = new Date();
  const created = new Date(pr.created_at);
  const lastUpdate = new Date(pr.updated_at || pr.created_at);
  
  // Days since last activity (more accurate than just age)
  const daysSinceUpdate = Math.max(0, (now - lastUpdate) / (1000 * 60 * 60 * 24));
  
  // Logarithmic staleness scale: small changes early, steep later
  const staleness_score = Math.min(
    Math.round(Math.log(daysSinceUpdate + 1) * 15),
    100
  );

  // Size: 100% reached at 500 lines changed
  const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
  const size_score = Math.min(Math.round((totalChanges / 500) * 100), 100);

  // Priority: More weight on staleness (60%) than size (40%)
  const priority_score = Math.round((staleness_score * 0.6) + (size_score * 0.4));

  // Risk scoring based on file criticality
  const criticalPaths = /src\/core|src\/auth|db\.js|index\.js|\.config|package\.json|\.env/i;
  const files = Array.isArray(pr.files_changed) ? pr.files_changed : [];
  const touchesCritical = files.some(f => criticalPaths.test(f));
  const largeChange = totalChanges > 300;
  const stale = staleness_score > 60;
  const noDraft = !pr.draft;

  let risk_score = 'low';
  if ((touchesCritical && noDraft) || (largeChange && stale) || (stale && staleness_score > 90)) {
    risk_score = 'high';
  } else if ((largeChange || stale || touchesCritical) && noDraft) {
    risk_score = 'medium';
  }

  return { 
    ...pr, 
    staleness_score, 
    size_score, 
    priority_score,
    risk_score
  };
}

module.exports = { scorePR };
