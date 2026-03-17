'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

type HealthData = {
  bus_factor_score: number;
  maintainability_grade: string;
  hero_developer: string;
  stagnant_pr: string;
  leaders: string[];
  risks: string[];
  recommendation: string[] | string;
  no_data?: boolean;
};

function busFactorColor(score: number) {
  if (score < 3) return '#ef4444';
  if (score < 6) return '#facc15';
  return '#22c55e';
}

function gradeColor(grade: string) {
  if (grade === 'A') return '#22c55e';
  if (grade === 'B') return '#facc15';
  return '#ef4444';
}

function HealthPageContent() {
  const searchParams = useSearchParams();
  const repo = searchParams.get('repo') || '';
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHealth() {
      if (!repo) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch(apiUrl(`/api/analysis/health/${encodeURIComponent(repo)}`));
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load health radar');
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

    loadHealth();
  }, [repo]);

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#d1fae5', padding: '2rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Link href={`/?repo=${encodeURIComponent(repo)}`} style={{ color: '#67e8f9', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: 12 }}>← Back</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, marginTop: 10 }}>Health Radar</h1>
        <p style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)', marginBottom: '1.25rem' }}>Repository: {repo || 'missing repo param'}</p>

        {loading && <p style={{ fontFamily: 'var(--font-mono)', color: '#67e8f9' }}>Loading health metrics...</p>}
        {error && <p style={{ fontFamily: 'var(--font-mono)', color: '#ef4444' }}>{error}</p>}

        {!loading && data && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
              <div style={{ border: '1px solid #134e4a', borderRadius: 10, padding: '1rem', background: '#03110e' }}>
                <p style={{ fontFamily: 'var(--font-mono)', color: '#67e8f9', fontSize: 12 }}>Bus Factor Score</p>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 1, color: busFactorColor(Number(data.bus_factor_score)) }}>
                  {data.bus_factor_score}
                </div>
              </div>

              <div style={{ border: '1px solid #134e4a', borderRadius: 10, padding: '1rem', background: '#03110e' }}>
                <p style={{ fontFamily: 'var(--font-mono)', color: '#67e8f9', fontSize: 12 }}>Maintainability Grade</p>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 72, lineHeight: 1, color: gradeColor(String(data.maintainability_grade || '').toUpperCase()) }}>
                  {String(data.maintainability_grade || '-').toUpperCase()}
                </div>
              </div>

              <div style={{ border: '1px solid #134e4a', borderRadius: 10, padding: '1rem', background: '#03110e' }}>
                <p style={{ fontFamily: 'var(--font-mono)', color: '#67e8f9', fontSize: 12 }}>Hero Developer</p>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginTop: 8 }}>👑 {data.hero_developer || 'Unknown'}</div>
                <p style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8', fontSize: 12, marginTop: 10 }}>
                  Leaders: {(Array.isArray(data.leaders) ? data.leaders : []).join(', ') || 'N/A'}
                </p>
              </div>

              <div style={{ border: '1px solid #7f1d1d', borderRadius: 10, padding: '1rem', background: '#190505' }}>
                <p style={{ fontFamily: 'var(--font-mono)', color: '#fca5a5', fontSize: 12 }}>Stagnant PR</p>
                <div style={{ fontFamily: 'var(--font-mono)', color: '#fee2e2', fontSize: 14, marginTop: 8 }}>⚠ {data.stagnant_pr || 'N/A'}</div>
              </div>
            </div>

            <div style={{ border: '1px solid #7f1d1d', borderRadius: 10, padding: '1rem', background: '#10090a' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: '#fca5a5', fontSize: 22, marginBottom: 10 }}>Risk Flags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(Array.isArray(data.risks) ? data.risks : []).map((risk, index) => (
                  <span key={`${risk}-${index}`} style={{
                    border: '1px solid #dc2626',
                    background: '#450a0a',
                    color: '#fecaca',
                    borderRadius: 999,
                    padding: '0.35rem 0.65rem',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {risk}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid #164e63', borderRadius: 10, padding: '1rem', background: '#020617' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: '#67e8f9', fontSize: 22, marginBottom: 8 }}>CTO Recommendations</h3>
              <ul style={{ marginLeft: 20, color: '#e2e8f0', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>
                {(Array.isArray(data.recommendation)
                  ? data.recommendation
                  : String(data.recommendation || '').split('\n').filter(Boolean)
                ).map((item, index) => (
                  <li key={`${item}-${index}`}>{item.replace(/^[-*]\s*/, '')}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!loading && !data && !error && (
          <p style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
            No health data yet for this repository. Go back and run Analyze first to ingest PR data.
          </p>
        )}
      </div>
    </main>
  );
}

export default function HealthPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#000', color: '#d1fae5', padding: '2rem' }}>Loading health...</main>}>
      <HealthPageContent />
    </Suspense>
  );
}
