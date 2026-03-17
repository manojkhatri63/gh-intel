'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiUrl } from '../lib/api';

type PR = {
  id: number;
  repo_name: string;
  pr_number: number;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
  additions: number;
  deletions: number;
  priority_score: number;
};

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function scoreColor(score: number) {
  if (score >= 7) return '#ff4444';
  if (score >= 4) return '#facc15';
  return '#22c55e';
}

function scoreLabel(score: number) {
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MED';
  return 'LOW';
}

function sizeLabel(add: number, del: number) {
  const total = add + del;
  if (total > 300) return 'XL';
  if (total > 100) return 'LG';
  if (total > 50) return 'MD';
  return 'SM';
}

function PRsPageContent() {
  const searchParams = useSearchParams();
  const repo = searchParams.get('repo') || '';
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'med' | 'low'>('all');

  useEffect(() => {
    const url = repo
      ? apiUrl(`/api/prs?repo=${encodeURIComponent(repo)}`)
      : apiUrl('/api/prs');
    fetch(url)
      .then(r => r.json())
      .then(data => { setPrs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setPrs([]); setLoading(false); });
  }, [repo]);

  const filtered = prs.filter(pr => {
    if (filter === 'high') return pr.priority_score >= 7;
    if (filter === 'med') return pr.priority_score >= 4 && pr.priority_score < 7;
    if (filter === 'low') return pr.priority_score < 4;
    return true;
  });

  const handleRefresh = async () => {
    if (!repo) return;
    setRefreshing(true);
    try {
      await fetch(apiUrl('/api/prs/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo }),
      });
      const r = await fetch(apiUrl(`/api/prs?repo=${encodeURIComponent(repo)}`));
      const data = await r.json();
      setPrs(Array.isArray(data) ? data : []);
    } catch {
      // keep existing
    }
    setRefreshing(false);
  };

  const high = prs.filter(p => p.priority_score >= 7).length;
  const med = prs.filter(p => p.priority_score >= 4 && p.priority_score < 7).length;
  const low = prs.filter(p => p.priority_score < 4).length;

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#d1fae5', padding: '2rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <Link href={repo ? `/?repo=${encodeURIComponent(repo)}` : '/'} style={{
            fontSize: 12, color: '#67e8f9', textDecoration: 'none', fontFamily: 'var(--font-mono)',
          }}>← back</Link>
          <span style={{ color: '#1e3a3a' }}>/</span>
          <span style={{ fontSize: 12, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>pr-digest</span>
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: '2rem' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800,
              color: '#d1fae5', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6,
            }}>PR Digest</h1>
            <p style={{ fontSize: 13, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              {repo || 'all repos'} · {prs.length} open · ranked by priority score
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || !repo}
            style={{
              background: '#052e16', border: '1px solid #22c55e',
              color: refreshing ? '#4ade80' : '#bbf7d0',
              padding: '8px 18px', borderRadius: 8,
              cursor: repo && !refreshing ? 'pointer' : 'not-allowed',
              fontSize: 12, fontFamily: 'var(--font-mono)',
              opacity: repo ? 1 : 0.4,
            }}
          >
            {refreshing ? 'refreshing...' : '↻ refresh'}
          </button>
        </div>

        {/* stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.75rem' }}>
          {[
            { label: 'High Priority', count: high, color: '#ff4444', border: '#ff444455', bg: '#1a0808' },
            { label: 'Medium Priority', count: med, color: '#facc15', border: '#facc1555', bg: '#1a1506' },
            { label: 'Low Priority', count: low, color: '#22c55e', border: '#22c55e55', bg: '#081a10' },
          ].map(({ label, count, color, border, bg }) => (
            <div key={label} style={{
              background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '1rem',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                {count}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
          {(['all', 'high', 'med', 'low'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? '#052e16' : 'transparent',
              border: `1px solid ${filter === f ? '#22c55e' : '#1e3a3a'}`,
              color: filter === f ? '#86efac' : '#475569',
              padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
              fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              transition: 'all 0.15s',
            }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* PR list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{
                height: 90, borderRadius: 10,
                background: '#0d1117', border: '1px solid #134e4a',
                animation: 'shimmer 1.5s infinite',
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((pr, idx) => {
              const color = scoreColor(pr.priority_score);
              return (
                <div key={pr.id} style={{
                  background: '#0d1117', border: '1px solid #134e4a',
                  borderRadius: 10, padding: '1rem 1.25rem',
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: 16, alignItems: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                  animation: `fadeUp 0.3s ease ${idx * 60}ms both`,
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#22c55e55';
                    (e.currentTarget as HTMLDivElement).style.background = '#0b1510';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#134e4a';
                    (e.currentTarget as HTMLDivElement).style.background = '#0d1117';
                  }}
                >
                  <div>
                    {/* top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 999,
                        background: color + '18', color, border: `1px solid ${color}44`,
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                      }}>{scoreLabel(pr.priority_score)}</span>
                      <span style={{ fontSize: 11, color: '#67e8f9', fontFamily: 'var(--font-mono)' }}>
                        {pr.repo_name}
                      </span>
                      <span style={{ fontSize: 11, color: '#334155' }}>#{pr.pr_number}</span>
                    </div>

                    {/* title */}
                    <p style={{
                      fontSize: 14, color: '#e2e8f0', fontFamily: 'var(--font-mono)',
                      marginBottom: 8, lineHeight: 1.4,
                    }}>{pr.title}</p>

                    {/* meta */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#475569', fontFamily: 'var(--font-mono)' }}>
                        {pr.author}
                      </span>
                      <span style={{ fontSize: 11, color: '#475569', fontFamily: 'var(--font-mono)' }}>
                        stale {daysSince(pr.updated_at)}d
                      </span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: '#22c55e' }}>+{pr.additions}</span>
                        {' '}
                        <span style={{ color: '#ff4444' }}>-{pr.deletions}</span>
                      </span>
                      <span style={{
                        fontSize: 10, color: '#475569',
                        background: '#0a0f0a', border: '1px solid #1e3a2e',
                        padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)',
                      }}>{sizeLabel(pr.additions, pr.deletions)}</span>
                    </div>
                  </div>

                  {/* score */}
                  <div style={{ textAlign: 'center', minWidth: 52 }}>
                    <div style={{
                      fontSize: 24, fontWeight: 700, color,
                      fontFamily: 'var(--font-display)', lineHeight: 1,
                      textShadow: `0 0 20px ${color}66`,
                    }}>
                      {pr.priority_score.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 9, color: '#475569', marginTop: 3, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                      SCORE
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '3rem',
                color: '#475569', fontFamily: 'var(--font-mono)', fontSize: 13,
                border: '1px solid #134e4a', borderRadius: 10, background: '#0d1117',
              }}>
                {prs.length === 0
                  ? 'No PRs found. Run Analyze on the homepage first.'
                  : 'No PRs match this filter.'}
              </div>
            )}
          </div>
        )}

        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.7; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </main>
  );
}

export default function PRsPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#000', color: '#d1fae5', padding: '2rem' }}>Loading...</main>}>
      <PRsPageContent />
    </Suspense>
  );
}