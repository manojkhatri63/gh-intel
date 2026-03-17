'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

type VelocityData = {
  revenue_drivers: number;
  technical_debt: number;
  maintenance: number;
  hero_insight: string;
  top_revenue_pr: string;
  top_debt_pr: string;
  no_data?: boolean;
};

function VelocityPageContent() {
  const searchParams = useSearchParams();
  const repo = searchParams.get('repo') || '';
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backendUrl = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001', []);

  useEffect(() => {
    async function loadVelocity() {
      if (!repo) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${backendUrl}/api/analysis/velocity/${encodeURIComponent(repo)}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load velocity analysis');
        }
        const payload = await response.json();
        if (payload?.no_data) {
          setData(null);
          return;
        }
        setData(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }
    loadVelocity();
  }, [backendUrl, repo]);

  const revenue = Math.max(0, Math.min(100, Number(data?.revenue_drivers || 0)));
  const debt = Math.max(0, Math.min(100, Number(data?.technical_debt || 0)));
  const maintenance = Math.max(0, Math.min(100, Number(data?.maintenance || 0)));

  const bars = [
    { label: 'Revenue Drivers', pct: revenue, color: '#00ff88', border: '#00ff8840' },
    { label: 'Technical Debt',  pct: debt,    color: '#ff4444', border: '#ff444440' },
    { label: 'Maintenance',     pct: maintenance, color: '#facc15', border: '#facc1540' },
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#d1fae5', padding: '2rem', fontFamily: 'monospace' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href={`/?repo=${encodeURIComponent(repo)}`} style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 12 }}>← Back</Link>
        <h1 style={{ fontSize: 40, marginTop: 10, color: '#00ff88', letterSpacing: '-0.02em' }}>Semantic Velocity</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: 13 }}>Repository: {repo || 'missing repo param'}</p>

        {loading && (
          <div style={{ color: '#00d4ff', fontSize: 14 }}>
            <span style={{ marginRight: 8, display: 'inline-block', animation: 'spin 0.9s linear infinite' }}>◌</span>
            Analyzing team velocity...
          </div>
        )}
        {error && <p style={{ color: '#ff4444' }}>{error}</p>}

        {!loading && data && (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* Percentage Bars */}
            <div style={{ border: '1px solid #1a3a2a', borderRadius: 12, padding: '1.75rem', background: '#0d0d0d' }}>
              <div style={{ fontSize: 11, color: '#00ff88', marginBottom: 24, letterSpacing: '0.12em' }}>{'// WHERE IS THE TIME GOING'}</div>
              <div style={{ display: 'grid', gap: 20 }}>
                {bars.map(({ label, pct, color, border }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <span style={{ color, fontSize: 13, letterSpacing: '0.04em' }}>{label}</span>
                      <span style={{ color, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 28, background: '#111', borderRadius: 6, border: `1px solid ${border}`, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}cc, ${color})`,
                        borderRadius: 6,
                        boxShadow: `0 0 16px ${color}66`,
                        transition: 'width 1s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Insight */}
            {data.hero_insight && (
              <div style={{
                border: '1px solid #00d4ff33',
                borderRadius: 10,
                padding: '1.25rem 1.5rem',
                background: '#060e14',
                boxShadow: '0 0 24px #00d4ff18',
              }}>
                <div style={{ fontSize: 10, color: '#00d4ff', marginBottom: 10, letterSpacing: '0.12em' }}>{'// CTO INSIGHT'}</div>
                <p style={{ color: '#e2e8f0', fontSize: 16, lineHeight: 1.7, margin: 0 }}>&quot;{data.hero_insight}&quot;</p>
              </div>
            )}

            {/* Top PRs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {data.top_revenue_pr && (
                <div style={{ border: '1px solid #00ff8833', borderRadius: 10, padding: '1.25rem', background: '#0a1a10' }}>
                  <div style={{ fontSize: 10, color: '#00ff88', marginBottom: 10, letterSpacing: '0.12em' }}>{'// TOP REVENUE DRIVER'}</div>
                  <p style={{ color: '#d1fae5', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{data.top_revenue_pr}</p>
                </div>
              )}
              {data.top_debt_pr && (
                <div style={{ border: '1px solid #ff444433', borderRadius: 10, padding: '1.25rem', background: '#1a0a0a' }}>
                  <div style={{ fontSize: 10, color: '#ff4444', marginBottom: 10, letterSpacing: '0.12em' }}>{'// TOP DEBT PR'}</div>
                  <p style={{ color: '#fecaca', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{data.top_debt_pr}</p>
                </div>
              )}
            </div>

          </div>
        )}

        {!loading && !data && !error && (
          <p style={{ color: '#64748b' }}>
            No velocity data yet for this repository. Go back and run Analyze first to ingest PR data.
          </p>
        )}
      </div>
    </main>
  );
}

export default function VelocityPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#d1fae5', padding: '2rem' }}>Loading velocity...</main>}>
      <VelocityPageContent />
    </Suspense>
  );
}

