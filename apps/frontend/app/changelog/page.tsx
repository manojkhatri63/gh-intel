'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

type ChangelogEntry = {
  id?: number;
  type?: string;
  commit_message?: string;
  author?: string;
  committed_at?: string;
};

type GroupedCommits = {
  feat: ChangelogEntry[];
  fix: ChangelogEntry[];
  chore: ChangelogEntry[];
  other: ChangelogEntry[];
};

function groupByType(entries: ChangelogEntry[]): GroupedCommits {
  return entries.reduce<GroupedCommits>((acc, entry) => {
    const key = String(entry.type || '').toLowerCase();
    if (key === 'feat' || key === 'fix' || key === 'chore') {
      acc[key].push(entry);
    } else {
      acc.other.push(entry);
    }
    return acc;
  }, { feat: [], fix: [], chore: [], other: [] });
}

function ChangelogPageContent() {
  const searchParams = useSearchParams();
  const repo = searchParams.get('repo') || '';
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  const backendUrl = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001', []);

  useEffect(() => {
    async function loadChangelog() {
      setLoading(true);
      setError('');
      try {
        const query = repo ? `?repo=${encodeURIComponent(repo)}` : '';
        const response = await fetch(`${backendUrl}/api/changelog${query}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load changelog');
        }

        const payload = await response.json();
        setEntries(Array.isArray(payload) ? payload : []);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }

    loadChangelog();
  }, [backendUrl, repo]);

  async function generateReleaseNotes() {
    setGenerating(true);
    setError('');

    try {
      const response = await fetch(`${backendUrl}/api/changelog/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repo || undefined })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to generate release notes');
      }

      const payload = await response.json();
      setNotes(typeof payload?.changelog === 'string' ? payload.changelog : 'No release notes generated.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unexpected error');
    } finally {
      setGenerating(false);
    }
  }

  const grouped = groupByType(entries);

  return (
    <main style={{ minHeight: '100vh', background: '#010409', color: '#d1fae5', padding: '2rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link href={`/?repo=${encodeURIComponent(repo)}`} style={{ color: '#67e8f9', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: 12 }}>← Back</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, marginTop: 10 }}>Changelog</h1>
        <p style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)', marginBottom: '1.25rem' }}>Repository context: {repo || 'global feed'}</p>

        <button onClick={generateReleaseNotes} disabled={generating} style={{
          border: '1px solid #22c55e',
          background: '#052e16',
          color: '#bbf7d0',
          borderRadius: 8,
          padding: '0.65rem 1rem',
          fontFamily: 'var(--font-mono)',
          cursor: generating ? 'not-allowed' : 'pointer',
          marginBottom: '1rem'
        }}>
          {generating ? 'Generating...' : 'Generate Release Notes'}
        </button>

        {error && <p style={{ color: '#ef4444', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{error}</p>}

        {loading && <p style={{ color: '#67e8f9', fontFamily: 'var(--font-mono)' }}>Loading changelog entries...</p>}

        {!loading && (
          <div style={{ display: 'grid', gap: 12 }}>
            {([
              ['feat', grouped.feat, '#22c55e'],
              ['fix', grouped.fix, '#facc15'],
              ['chore', grouped.chore, '#06b6d4'],
            ] as Array<[string, ChangelogEntry[], string]>).map(([label, items, color]) => (
              <div key={label} style={{ border: '1px solid #164e63', borderRadius: 10, padding: '1rem', background: '#020617' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color, fontSize: 24, marginBottom: 8 }}>{label.toUpperCase()}</h3>
                {items.length === 0 && <p style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: 12 }}>No commits in this category.</p>}
                {items.map((entry, index) => (
                  <div key={`${label}-${index}`} style={{ borderTop: index ? '1px solid #0f172a' : 'none', paddingTop: index ? 8 : 0, marginTop: index ? 8 : 0 }}>
                    <p style={{ color: '#e2e8f0', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{entry.commit_message || 'No message'}</p>
                    <p style={{ color: '#64748b', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{entry.author || 'Unknown author'}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {notes && (
          <div style={{ marginTop: '1rem', border: '1px solid #14532d', background: '#052e16', borderRadius: 10, padding: '1rem' }}>
            <h3 style={{ color: '#86efac', fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>AI Release Notes</h3>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#dcfce7', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }}>{notes}</pre>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ChangelogPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#010409', color: '#d1fae5', padding: '2rem' }}>Loading changelog...</main>}>
      <ChangelogPageContent />
    </Suspense>
  );
}
