'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  if (score >= 7) return '#f87171';
  if (score >= 4) return '#fbbf24';
  return '#34d399';
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

const MOCK_PRS: PR[] = [
  { id: 1, repo_name: 'gh-intel', pr_number: 12, title: 'feat: add priority scoring algorithm', author: 'manojkhatri63', created_at: new Date(Date.now() - 12 * 86400000).toISOString(), updated_at: new Date(Date.now() - 8 * 86400000).toISOString(), additions: 420, deletions: 55, priority_score: 8.4 },
  { id: 2, repo_name: 'gh-intel', pr_number: 11, title: 'fix: webhook signature verification', author: 'dev2', created_at: new Date(Date.now() - 6 * 86400000).toISOString(), updated_at: new Date(Date.now() - 2 * 86400000).toISOString(), additions: 38, deletions: 12, priority_score: 5.1 },
  { id: 3, repo_name: 'gh-intel', pr_number: 9, title: 'chore: update dependencies', author: 'manojkhatri63', created_at: new Date(Date.now() - 3 * 86400000).toISOString(), updated_at: new Date(Date.now() - 1 * 86400000).toISOString(), additions: 22, deletions: 18, priority_score: 2.3 },
];

export default function PRsPage() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'med' | 'low'>('all');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/prs`)
      .then(r => r.json())
      .then(data => { setPrs(Array.isArray(data) ? data : MOCK_PRS); setLoading(false); })
      .catch(() => { setPrs(MOCK_PRS); setLoading(false); });
  }, []);

  const filtered = prs.filter(pr => {
    if (filter === 'high') return pr.priority_score >= 7;
    if (filter === 'med') return pr.priority_score >= 4 && pr.priority_score < 7;
    if (filter === 'low') return pr.priority_score < 4;
    return true;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/prs/refresh`, { method: 'POST' });
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/prs`);
      const data = await r.json();
      setPrs(Array.isArray(data) ? data : MOCK_PRS);
    } catch {
      // keep existing
    }
    setRefreshing(false);
  };

  const high = prs.filter(p => p.priority_score >= 7).length;
  const med = prs.filter(p => p.priority_score >= 4 && p.priority_score < 7).length;
  const low = prs.filter(p => p.priority_score < 4).length;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem', maxWidth: 860, margin: '0 auto' }}>

      {/* header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <Link href="/" style={{
            fontSize: 12, color: 'var(--muted)', textDecoration: 'none',
            fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4,
          }}>← home</Link>
          <span style={{ color: 'var(--faint)' }}>/</span>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>pr-digest</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4,
            }}>PR Digest</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {prs.length} open · ranked by priority score
            </p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            color: refreshing ? 'var(--muted)' : 'var(--text)',
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-mono)',
            transition: 'border-color 0.2s',
          }}>
            {refreshing ? 'refreshing...' : '↻ refresh'}
          </button>
        </div>
      </div>

      {/* stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.75rem' }}>
        {[
          { label: 'High priority', count: high, color: '#f87171' },
          { label: 'Medium priority', count: med, color: '#fbbf24' },
          { label: 'Low priority', count: low, color: '#34d399' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '1rem',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
              {count}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
        {(['all', 'high', 'med', 'low'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? 'var(--accent-dim)' : 'transparent',
            border: `1px solid ${filter === f ? 'var(--accent-glow)' : 'var(--border)'}`,
            color: filter === f ? 'var(--accent)' : 'var(--muted)',
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
              height: 90, borderRadius: 12,
              background: 'var(--card)', border: '1px solid var(--border)',
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
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '1rem 1.25rem',
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: 16, alignItems: 'center',
                transition: 'border-color 0.15s, background 0.15s',
                animation: `fadeUp 0.3s ease ${idx * 60}ms both`,
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-bright)';
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--card-hover)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--card)';
                }}
              >
                <div>
                  {/* top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 999,
                      background: color + '18', color,
                      border: `1px solid ${color}44`,
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                    }}>{scoreLabel(pr.priority_score)}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {pr.repo_name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--faint)' }}>#{pr.pr_number}</span>
                  </div>

                  {/* title */}
                  <p style={{
                    fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-mono)',
                    marginBottom: 8, lineHeight: 1.4,
                  }}>{pr.title}</p>

                  {/* meta */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {pr.author}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      stale {daysSince(pr.updated_at)}d
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: '#34d399' }}>+{pr.additions}</span>
                      {' '}
                      <span style={{ color: '#f87171' }}>-{pr.deletions}</span>
                    </span>
                    <span style={{
                      fontSize: 10, color: 'var(--muted)',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)',
                    }}>{sizeLabel(pr.additions, pr.deletions)}</span>
                  </div>
                </div>

                {/* score */}
                <div style={{ textAlign: 'center', minWidth: 52 }}>
                  <div style={{
                    fontSize: 22, fontWeight: 700, color,
                    fontFamily: 'var(--font-display)', lineHeight: 1,
                  }}>
                    {pr.priority_score.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                    SCORE
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '3rem',
              color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 13,
            }}>
              no prs match this filter.
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
    </main>
  );
}