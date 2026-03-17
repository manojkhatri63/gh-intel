const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const token = process.env.GITHUB_TOKEN;

function getHeaders(useToken = true) {
  const headers = {
    Accept: 'application/vnd.github+json'
  };

  if (token && useToken) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function githubFetch(url) {
  const primary = await fetch(url, { headers: getHeaders(true) });
  if (primary.ok) {
    return primary;
  }

  // If token is missing/invalid or not authorized for the repo, retry unauthenticated for public repos.
  if ([401, 403, 404].includes(primary.status)) {
    const fallback = await fetch(url, { headers: getHeaders(false) });
    if (fallback.ok) {
      return fallback;
    }
  }

  return primary;
}

async function suggestReposForName(repoFullName) {
  const repoName = String(repoFullName || '').split('/')[1] || String(repoFullName || '');
  if (!repoName) return [];

  const query = encodeURIComponent(`${repoName} in:name`);
  const response = await githubFetch(
    `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=5`,
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.items)) {
    return [];
  }

  return data.items
    .map((item) => item?.full_name)
    .filter(Boolean)
    .slice(0, 3);
}

async function searchRepositories(queryText) {
  const query = String(queryText || '').trim();
  if (!query) {
    return [];
  }

  const encoded = encodeURIComponent(`${query} in:name`);
  const response = await githubFetch(
    `https://api.github.com/search/repositories?q=${encoded}&sort=stars&order=desc&per_page=8`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub repository search failed: ${response.status}. ${errorText}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.items)) {
    return [];
  }

  return data.items.map((item) => ({
    full_name: item.full_name,
    description: item.description || '',
    stars: item.stargazers_count || 0,
    private: Boolean(item.private),
  }));
}

async function fetchOpenPRsForRepo(repoFullName) {
  const prs = [];
  let page = 1;

  while (true) {
    const response = await githubFetch(
      `https://api.github.com/repos/${repoFullName}/pulls?state=open&per_page=100&page=${page}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        const suggestions = await suggestReposForName(repoFullName);
        const hint = suggestions.length
          ? ` Repository not found. Did you mean: ${suggestions.join(', ')}?`
          : ' Repository not found.';
        throw new Error(`GitHub API error for ${repoFullName}: ${response.status}.${hint} ${errorText}`);
      }

      throw new Error(`GitHub API error for ${repoFullName}: ${response.status}. Check that the repository exists and your token has access. ${errorText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) break;

    const pagePRs = await Promise.all(
      data.map(async (pr) => {
        const detailResponse = await githubFetch(pr.url);

        if (!detailResponse.ok) {
          const errorText = await detailResponse.text();
          throw new Error(`GitHub API error for PR ${pr.number} in ${repoFullName}: ${detailResponse.status} ${errorText}`);
        }

        const detailData = await detailResponse.json();

        // Fetch files changed in this PR
        let files_changed = [];
        try {
          const filesResponse = await githubFetch(`${pr.url}/files?per_page=100`);
          if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            files_changed = Array.isArray(filesData) ? filesData.map(f => f.filename) : [];
          }
        } catch {
          // Silently fail if files can't be fetched
        }

        // Fetch commits in this PR
        let commits_count = 0;
        try {
          const commitsResponse = await githubFetch(`${pr.url}/commits?per_page=1`);
          if (commitsResponse.ok) {
            const link = commitsResponse.headers.get('link');
            // Parse pagination link to get total count
            const match = link?.match(/&page=(\d+)>; rel="last"/);
            commits_count = match ? parseInt(match[1], 10) : 1;
          }
        } catch {
          commits_count = 1;
        }

        return {
          repo_name: repoFullName,
          pr_number: pr.number,
          title: pr.title,
          author: pr.user.login,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          additions: detailData.additions,
          deletions: detailData.deletions,
          files_changed,
          review_comments: detailData.review_comments || 0,
          commits_count,
          draft: pr.draft || false,
        };
      })
    );

    prs.push(...pagePRs);

    page++;
  }

  return prs;
}

module.exports = {
  fetchOpenPRsForRepo,
  searchRepositories,
};
