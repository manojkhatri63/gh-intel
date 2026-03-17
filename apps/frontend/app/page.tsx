'use client';
import { useEffect, useState } from 'react';

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
      alert("Please enter a valid repo in 'owner/repo' format (e.g., facebook/react)");
      return;
    }

    setIsRefreshing(true);
    setStatusMessage('Analyzing repository...');

    try {
      const response = await fetch('http://localhost:3001/api/prs/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repoQuery })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const dbResponse = await fetch(`http://localhost:3001/api/prs?repo=${repoQuery}`);
        const dbData = await dbResponse.json();
        setPrs(dbData);
        setView('dashboard');
      } else {
        setStatusMessage(`Error: ${data.error || 'Failed to fetch'}`);
      }
    } catch (err) {
      setStatusMessage('Network error. Check backend connection.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--bg)',
      position: 'relative',
      overflowX: 'hidden',
    }}>

      {/* grid background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* Dynamic container width: narrow for search, wide for table */}
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        width: '100%', 
        maxWidth: view === 'search' ? 680 : 1000,
        transition: 'max-width 0.5s ease-in-out'
      }}>

        {/* --- VIEW 1: SEARCH INTERFACE --- */}
        {view === 'search' && (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)',
              borderRadius: 999, padding: '4px 14px', marginBottom: '2rem',
              fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 6px var(--green)',
                animation: 'pulse 2s infinite',
              }} />
              LIVE · GITHUB INTELLIGENCE TOOL
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 800,
              lineHeight: 1.05,
              color: 'var(--text)',
              marginBottom: '1.25rem',
              letterSpacing: '-0.02em',
            }}>
              Your GitHub, <span style={{ color: 'var(--accent)' }}>finally</span>
              <br />under control.
            </h1>

            <p style={{
              fontSize: 16, color: 'var(--muted)',
              lineHeight: 1.7, marginBottom: '2.5rem',
              maxWidth: 480,
              fontFamily: 'var(--font-mono)',
            }}>
              PR Digest scores every open pull request by staleness and size.
            </p>

            <form onSubmit={handleRefresh} style={{
              marginBottom: '2rem',
              display: 'flex',
              gap: '12px',
              padding: '4px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}>
              <input 
                type="text" 
                placeholder="Search repository (e.g. facebook/react)"
                value={repoQuery}
                onChange={(e) => setRepoQuery(e.target.value)}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  padding: '12px 16px', color: 'var(--text)',
                  fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none',
                }}
              />
              <button 
                type="submit"
                disabled={isRefreshing}
                style={{
                  background: isRefreshing ? 'var(--faint)' : 'var(--accent)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0 20px', fontSize: 13, fontWeight: 600,
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                }}
              >
                {isRefreshing ? 'SCORING...' : 'ANALYZE'}
              </button>
            </form>

            {statusMessage && (
              <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--green)', marginTop: '-1rem', marginBottom: '1.5rem' }}>
                {statusMessage}
              </p>
            )}

            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              fontFamily: 'var(--font-mono)',
            }}>
              {shown.map((line, i) => (
                <div key={i} style={{ fontSize: 13, color: i === shown.length - 1 ? 'var(--green)' : 'var(--muted)', marginBottom: 6 }}>
                  {line}
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- VIEW 2: DASHBOARD TABLE --- */}
        {view === 'dashboard' && (
          <div style={{ animation: 'fadeIn 0.5s ease', width: '100%' }}>
            <button 
              onClick={() => setView('search')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', marginBottom: '20px', padding: 0 }}
            >
              ← BACK TO SEARCH
            </button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text)', marginBottom: '2rem' }}>
              Intelligence Report: <span style={{ color: 'var(--accent)' }}>{repoQuery}</span>
            </h2>
            
            <div style={{ 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              borderRadius: 12, 
              overflowX: 'auto' // Allow horizontal scroll on mobile
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                textAlign: 'left', 
                fontFamily: 'var(--font-mono)',
                minWidth: '700px' // Ensure columns don't squash
              }}>
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
                      <td style={{ padding: '20px', fontWeight: 'bold', color: pr.priority_score > 70 ? 'var(--red)' : 'var(--green)' }}>
                        {pr.priority_score}%
                      </td>
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