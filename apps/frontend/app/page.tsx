'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

export default function Home() {
  const searchParams = useSearchParams();
  const [repo, setRepo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [readyRepo, setReadyRepo] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<Array<{ full_name: string; description: string; stars: number }>>([]);

  const backendUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  }, []);

  useEffect(() => {
    const queryRepo = searchParams.get('repo');
    if (queryRepo) {
      setRepo(queryRepo);
      setReadyRepo(queryRepo);
    }
  }, [searchParams]);

  function normalizeRepoInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return '';

    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const parsed = new URL(trimmed);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parsed.hostname.includes('github.com') && parts.length >= 2) {
          return `${parts[0]}/${parts[1].replace(/\.git$/i, '')}`;
        }
      }
    } catch {
      return trimmed;
    }

    return trimmed.replace(/^\/+/, '').replace(/\.git$/i, '');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = normalizeRepoInput(repo);

    if (!trimmed) {
      setError('Enter a repository in owner/repo format.');
      return;
    }

    // Keep navigation targets in sync with what the user submitted,
    // even if backend refresh fails.
    setReadyRepo(trimmed);
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/prs/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: trimmed })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch repository data.');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const trimmed = repo.trim();
    if (!trimmed || trimmed.length < 2) {
      setMatches([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`${backendUrl}/api/prs/search?q=${encodeURIComponent(trimmed)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = await response.json();
        setMatches(Array.isArray(data) ? data : []);
      } catch {
        setMatches([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [backendUrl, repo]);

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(circle at top, #06211b 0%, #010404 42%, #000 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(34,197,94,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6,182,212,0.08) 1px, transparent 1px)
        `,
        backgroundSize: '36px 36px',
      }} />

      <div style={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(16,185,129,0.20) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 680 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(34,211,238,0.35)',
          borderRadius: 999, padding: '4px 14px', marginBottom: '2rem',
          fontSize: 11, color: '#67e8f9', fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
            animation: 'pulse 2s infinite',
          }} />
          GH-INTEL TERMINAL MODE
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 800,
          lineHeight: 1.05,
          color: '#d1fae5',
          marginBottom: '1.25rem',
          letterSpacing: '-0.02em',
        }}>
          Scan Any Repo
          <br />
          <span style={{ color: '#67e8f9' }}>For Signal, Not Noise</span>
        </h1>

        <p style={{
          fontSize: 16, color: '#94a3b8',
          lineHeight: 1.7, marginBottom: '2.5rem',
          maxWidth: 620,
          fontFamily: 'var(--font-mono)',
        }}>
          Enter any GitHub repository and generate an AI intelligence packet across pull request priority,
          engineering health, team velocity, and release readiness.
        </p>

        <form onSubmit={onSubmit} style={{
          background: '#01090a',
          border: '1px solid #164e63',
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: '2rem',
          boxShadow: '0 0 28px rgba(6, 182, 212, 0.12)',
        }}>
          <label htmlFor="repo-input" style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            color: '#67e8f9',
            marginBottom: 10,
            fontSize: 12,
            letterSpacing: '0.04em',
          }}>
            Enter any GitHub repo (e.g. facebook/react)
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              id="repo-input"
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              placeholder="owner/repo"
              style={{
                flex: '1 1 300px',
                border: '1px solid #0e7490',
                background: '#020617',
                color: '#ccfbf1',
                borderRadius: 8,
                padding: '0.85rem 0.95rem',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                minWidth: 140,
                border: '1px solid #22c55e',
                background: '#052e16',
                color: '#bbf7d0',
                borderRadius: 8,
                padding: '0.85rem 1.1rem',
                fontFamily: 'var(--font-mono)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {(searching || matches.length > 0) && (
            <div style={{ marginTop: 10, border: '1px solid #0e7490', borderRadius: 8, background: '#010d12', overflow: 'hidden' }}>
              {searching && (
                <div style={{ padding: '0.65rem 0.85rem', color: '#67e8f9', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  Searching matches...
                </div>
              )}
              {!searching && matches.slice(0, 6).map((match) => (
                <button
                  key={match.full_name}
                  type="button"
                  onClick={() => {
                    setRepo(match.full_name);
                    setError('');
                    setMatches([]);
                  }}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderTop: '1px solid #082f49',
                    background: 'transparent',
                    color: '#e2e8f0',
                    textAlign: 'left',
                    padding: '0.7rem 0.85rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ color: '#99f6e4', fontSize: 13 }}>{match.full_name}</span>
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>★ {match.stars.toLocaleString()}</span>
                  </div>
                  {match.description && (
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {match.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {isLoading && (
            <div style={{ marginTop: 12, color: '#99f6e4', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <span style={{ display: 'inline-block', marginRight: 8, animation: 'spin 0.9s linear infinite' }}>◌</span>
              Pulling latest PR data...
            </div>
          )}
          {error && (
            <p style={{ marginTop: 12, color: '#f87171', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{error}</p>
          )}
        </form>

        {readyRepo && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { title: 'PR Digest',    href: `/prs?repo=${encodeURIComponent(readyRepo)}`,       desc: 'Rank all open pull requests by urgency.' },
              { title: 'Health Radar', href: `/health?repo=${encodeURIComponent(readyRepo)}`,    desc: 'Bus factor, maintainability, and risk profile.' },
              { title: 'Velocity',     href: `/velocity?repo=${encodeURIComponent(readyRepo)}`,  desc: 'Where engineering time is really going.' },
              { title: 'Conflicts',    href: `/conflicts?repo=${encodeURIComponent(readyRepo)}`, desc: 'Predict merge collisions before they happen.' },
              { title: 'Changelog',    href: `/changelog?repo=${encodeURIComponent(readyRepo)}`, desc: 'Grouped commit activity and release notes.' },
            ].map((card) => (
              <Link key={card.title} href={card.href} style={{
                border: '1px solid #164e63',
                borderRadius: 10,
                textDecoration: 'none',
                padding: '1rem',
                background: '#020c12',
                color: '#e2e8f0',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 6 }}>{card.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{card.desc}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}