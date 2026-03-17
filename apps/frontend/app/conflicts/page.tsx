'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

type ConflictEntry = {
  pr_number: number;
  title: string;
  collision_risk: 'high' | 'medium' | 'low';
  reason: string;
};

function riskColor(risk: string) {
  if (risk === 'high') return '#ff4444';
  if (risk === 'medium') return '#facc15';
  return '#00ff88';
}

function riskBg(risk: string) {
  if (risk === 'high') return '#2a0808';
  if (risk === 'medium') return '#2a1e06';
  return '#082a10';
}

const RISK_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function ConflictsPageContent() {
  const searchParams = useSearchParams();
  const repo = searchParams.get('repo') || '';
  const [data, setData] = useState<ConflictEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadConflicts() {
      if (!repo) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(apiUrl(`/api/analysis/conflicts/${encodeURIComponent(repo)}`));
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load conflict analysis');
        }
        const payload = await response.json();
        setData(Array.isArray(payload) ? payload : []);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }
    loadConflicts();
  }, [repo]);

  const sorted = [...data].sort(
    (a, b) => (RISK_ORDER[a.collision_risk] ?? 3) - (RISK_ORDER[b.collision_risk] ?? 3)
  );
  const highCount = data.filter((d) => d.collision_risk === 'high').length;
  const medCount  = data.filter((d) => d.collision_risk === 'medium').length;
  const lowCount  = data.filter((d) => d.collision_risk === 'low').length;

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#d1fae5', padding: '2rem', fontFamily: 'monospace' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link href={`/?repo=${encodeURIComponent(repo)}`} style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 12 }}>← Back</Link>
        <h1 style={{ fontSize: 40, marginTop: 10, color: '#ff4444', letterSpacing: '-0.02em' }}>Conflict Constellation</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: 13 }}>Repository: {repo || 'missing repo param'} — Pre-merge collision risk</p>

        {loading && (
          <div style={{ color: '#00d4ff', fontSize: 14 }}>
            <span style={{ marginRight: 8 }}>◌</span>
            Running pre-merge risk assessment...
          </div>
        )}
        {error && <p style={{ color: '#ff4444' }}>{error}</p>}

        {!loading && data.length > 0 && (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { count: highCount, label: 'HIGH COLLISION RISK', color: '#ff4444', border: '#ff444455', bg: '#1a0808' },
                { count: medCount,  label: 'MEDIUM COLLISION RISK', color: '#facc15', border: '#facc1555', bg: '#1a1506' },
                { count: lowCount,  label: 'LOW COLLISION RISK',  color: '#00ff88', border: '#00ff8855', bg: '#081a10' },
              ].map(({ count, label, color, border, bg }) => (
                <div key={label} style={{ border: `1px solid ${border}`, borderRadius: 10, padding: '1.25rem', background: bg, textAlign: 'center' }}>
                  <div style={{ fontSize: 52, fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 20px ${color}66` }}>{count}</div>
                  <div style={{ color, fontSize: 11, marginTop: 8, letterSpacing: '0.08em', opacity: 0.85 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* PR list sorted by risk */}
            <div style={{ border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: '#111', padding: '0.75rem 1rem', fontSize: 11, color: '#6366f1', letterSpacing: '0.1em', borderBottom: '1px solid #1a1a1a' }}>
                {'// MERGE CONFLICT PREDICTIONS - SORTED BY RISK'}
              </div>
              {sorted.map((entry, i) => {
                const color = riskColor(entry.collision_risk);
                return (
                  <div key={`${entry.pr_number}-${i}`} style={{
                    padding: '1rem 1.25rem',
                    borderTop: i > 0 ? '1px solid #111' : 'none',
                    background: i % 2 === 0 ? '#0a0a0a' : '#0d0d0d',
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr',
                    gap: '1rem',
                    alignItems: 'start',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#475569' }}>#{entry.pr_number}</span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        background: riskBg(entry.collision_risk),
                        color,
                        border: `1px solid ${color}55`,
                        boxShadow: `0 0 8px ${color}33`,
                      }}>
                        {entry.collision_risk}
                      </span>
                    </div>
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>{entry.title}</div>
                      <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
                        <span style={{ color: color + 'aa', marginRight: 6 }}>⚡</span>{entry.reason}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <p style={{ color: '#64748b' }}>No PR data found. Run Analyze on the homepage first.</p>
        )}
      </div>
    </main>
  );
}

export default function ConflictsPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#d1fae5', padding: '2rem' }}>Loading conflicts...</main>}>
      <ConflictsPageContent />
    </Suspense>
  );
}
