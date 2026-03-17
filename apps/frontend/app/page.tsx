'use client';
import { useEffect, useState } from 'react';

// 1. THIS IS THE CRITICAL PART
// It checks Vercel first, then falls back to local for your dev work.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const LINES = [
  '> initializing gh-intel...',
  '> connecting to github api... ok',
  '> fetching open pull requests... 12 found',
  '> scoring by staleness + size...',
  '> digest ready. good morning.',
];

export default function Home() {
  const [shown, setShown] = useState<string[]>([]);
  const [repoQuery, setRepoQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [view, setView] = useState<'search' | 'dashboard'>('search');
  const [prs, setPrs] = useState([]);

  useEffect(() => {
    LINES.forEach((line, i) => {
      setTimeout(() => setShown(prev => [...prev, line]), i * 600);
    });
  }, []);

  const handleRefresh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoQuery.includes('/')) {
      alert("Please enter a valid repo (e.g., facebook/react)");
      return;
    }

    setIsRefreshing(true);
    setStatusMessage('Analyzing repository...');

    try {
      // 2. USE THE DYNAMIC API_BASE HERE
      const response = await fetch(`${API_BASE}/api/prs/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repoQuery })
      });
      
      if (response.ok) {
        // 3. AND USE IT HERE TOO
        const dbResponse = await fetch(`${API_BASE}/api/prs?repo=${repoQuery}`);
        const dbData = await dbResponse.json();
        setPrs(dbData);
        setView('dashboard');
      } else {
        const errData = await response.json();
        setStatusMessage(`Error: ${errData.error || 'Failed to fetch'}`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage(`Network error. Connection refused at ${API_BASE}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      background: 'var(--bg)', position: 'relative', overflowX: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: view === 'search' ? 680 : 1000, transition: 'max-width 0.5s' }}>

        {view === 'search' && (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 999, padding: '4px 14px', marginBottom: '2rem', fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s infinite' }} />
              LIVE · GITHUB INTELLIGENCE TOOL
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, color: 'var(--text)', marginBottom: '1.25rem' }}>
              Your GitHub, <span style={{ color: 'var(--accent)' }}>finally</span><br />under control.
            </h1>

            <form onSubmit={handleRefresh} style={{ marginBottom: '2rem', display: 'flex', gap: '12px', padding: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <input 
                type="text" placeholder="Search repository..." value={repoQuery}
                onChange={(e) => setRepoQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 16px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none' }}
              />
              <button type="submit" disabled={isRefreshing} style={{ background: isRefreshing ? 'var(--faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 20px', fontWeight: 600, cursor: isRefreshing ? 'not-allowed' : 'pointer' }}>
                {isRefreshing ? 'SCORING...' : 'ANALYZE'}
              </button>
            </form>

            {statusMessage && <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--green)', marginTop: '-1rem', marginBottom: '1.5rem' }}>{statusMessage}</p>}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem', fontFamily: 'var(--font-mono)' }}>
              {shown.map((line, i) => (
                <div key={i} style={{ fontSize: 13, color: i === shown.length - 1 ? 'var(--green)' : 'var(--muted)', marginBottom: 6 }}>{line}</div>
              ))}
            </div>
          </>
        )}

        {view === 'dashboard' && (
          <div style={{ animation: 'fadeIn 0.5s ease', width: '100%' }}>
            <button onClick={() => setView('search')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', marginBottom: '20px' }}>← BACK</button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text)', marginBottom: '2rem' }}>Report: <span style={{ color: 'var(--accent)' }}>{repoQuery}</span></h2>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12 }}>
                    <th style={{ padding: '20px' }}>PRIORITY</th>
                    <th style={{ padding: '20px' }}>PULL REQUEST</th>
                    <th style={{ padding: '20px' }}>STALENESS</th>
                    <th style={{ padding: '20px' }}>SIZE</th>
                  </tr>
                </thead>
                <tbody>
                  {prs.map((pr: any) => (
                    <tr key={pr.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <td style={{ padding: '20px', fontWeight: 'bold', color: pr.priority_score > 70 ? 'var(--red)' : 'var(--green)' }}>{pr.priority_score}%</td>
                      <td style={{ padding: '20px' }}>
                        <div style={{ color: 'var(--text)', marginBottom: '4px' }}>{pr.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>#{pr.pr_number} by @{pr.author}</div>
                      </td>
                      <td style={{ padding: '20px', color: 'var(--muted)' }}>{pr.staleness_score}/100</td>
                      <td style={{ padding: '20px', color: 'var(--muted)' }}>{pr.size_score}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}
