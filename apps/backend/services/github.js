const axios = require('axios');

async function fetchOpenPRsForRepo(repo) {
  let allPrs = [];
  let page = 1;
  let hasMore = true;

  // We loop until we've grabbed everything or hit a reasonable limit (e.g., 500 PRs)
  while (hasMore && page <= 5) {
    console.log(`📡 Fetching page ${page} for ${repo}...`);
    
    const response = await axios.get(
      `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100&page=${page}`,
      {
        headers: { 
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const prs = response.data.map(pr => ({
      repo_name: repo,
      pr_number: pr.number,
      title: pr.title,
      author: pr.user.login,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      // Note: simple 'pulls' list doesn't include additions/deletions 
      // by default, so we'll set them to 0 or fetch separately later
      additions: 0, 
      deletions: 0
    }));

    allPrs = [...allPrs, ...prs];

    // If we got 100 results, there's likely a next page. 
    // If we got less, we've reached the end of the list.
    if (response.data.length === 100) {
      page++;
    } else {
      hasMore = false;
    }
  }

  return allPrs;
}

module.exports = { fetchOpenPRsForRepo };