function normalizeRepoInput(input) {
  if (typeof input !== 'string') {
    throw new Error('Repository must be a string in owner/repo format.');
  }

  let value = input.trim();
  if (!value) {
    throw new Error('Repository name is required (owner/repo).');
  }

  // Support pasted GitHub URLs like https://github.com/owner/repo(.git)
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      if (!parsed.hostname.includes('github.com')) {
        throw new Error('Only github.com repository URLs are supported.');
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      value = parts.slice(0, 2).join('/');
    } catch {
      throw new Error('Invalid repository URL. Use owner/repo or a github.com URL.');
    }
  }

  value = value.replace(/^\/+/, '').replace(/\.git$/i, '');

  const [owner, repo] = value.split('/');
  if (!owner || !repo || value.split('/').length !== 2) {
    throw new Error('Repository must be in owner/repo format.');
  }

  const segmentPattern = /^[A-Za-z0-9_.-]+$/;
  if (!segmentPattern.test(owner) || !segmentPattern.test(repo)) {
    throw new Error('Repository contains unsupported characters.');
  }

  return `${owner}/${repo}`;
}

function isRepoValidationError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /Repository|owner\/repo|github\.com/.test(message);
}

module.exports = {
  normalizeRepoInput,
  isRepoValidationError
};
