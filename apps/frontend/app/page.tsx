'use client';
import Link from 'next/link';
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
  // New state for repository input and loading status
  const [repoQuery, setRepoQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    LINES.forEach((line, i) => {
      setTimeout(() => setShown(prev => [...prev, line]), i * 600);
    });
  }, []);

  // New function to trigger the backend refresh
  const handleRefresh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoQuery.includes('/')) {
      alert("Please enter a valid repo in 'owner/repo' format (e.g., facebook/react)");
      return;
    }

    setIsRefreshing(true);
    setStatusMessage('Analyzing repository...');

    try {
      const response = await fetch('/api/prs/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repoQuery })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatusMessage(`Success: ${data.message}`);
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
      overflow: 'hidden',
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

      {/* top glow */}
      <div style={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(79,142,247,0.08) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 680 }}>

        {/* badge */}
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

        {/* headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 800,
          lineHeight: 1.05,
          color: 'var(--text)',
          marginBottom: '1.25rem',
          letterSpacing: '-0.02em',
        }}>
          Your GitHub,{' '}
          <span style={{ color: 'var(--accent)' }}>finally</span>
          <br />under control.
        </h1>

        <p style={{
          fontSize: 16, color: 'var(--muted)',
          lineHeight: 1.7, marginBottom: '2.5rem',
          maxWidth: 480,
          fontFamily: 'var(--font-mono)',
        }}>
          PR Digest scores every open pull request by staleness and size.
          Get a prioritized briefing every morning — no more lost PRs.
        </p>

        {/* NEW: Search Input Section */}
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
            placeholder="Search repository (e.g. vercel/next.js)"
            value={repoQuery}
            onChange={(e) => setRepoQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '12px 16px',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button 
            type="submit"
            disabled={isRefreshing}
            style={{
              background: isRefreshing ? 'var(--faint)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0 20px',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {isRefreshing ? 'SCORING...' : 'ANALYZE'}
          </button>
        </form>

        {statusMessage && (
          <p style={{ 
            fontSize: 12, 
            fontFamily: 'var(--font-mono)', 
            color: statusMessage.includes('Error') ? 'var(--red)' : 'var(--green)',
            marginTop: '-1.5rem',
            marginBottom: '1.5rem' 
          }}>
            {statusMessage}
          </p>
        )}

        {/* terminal block */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: '2.5rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            {['#f87171','#fbbf24','#34d399'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
              gh-intel — terminal
            </span>
          </div>
          <div style={{ padding: '1.25rem 1.5rem', minHeight: 140 }}>
            {shown.map((line, i) => (
              <div key={i} style={{
                fontSize: 13, color: i === shown.length - 1 ? 'var(--green)' : 'var(--muted)',
                marginBottom: 6, fontFamily: 'var(--font-mono)',
                animation: 'fadeIn 0.3s ease',
              }}>
                {line}
                {i === shown.length - 1 && shown.length < LINES.length && (
                  <span style={{ animation: 'blink 1s infinite', color: 'var(--accent)' }}>█</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '2.5rem' }}>
          {[
            { label: 'PR Digest', desc: 'Open PRs ranked by priority score. Know what needs a review first.', tag: 'DAILY' },
            { label: 'Auto Changelog', desc: 'Commits grouped by feat / fix / chore. Published to this page automatically.', tag: 'WEBHOOK' },
          ].map(({ label, desc, tag }) => (
            <div key={label} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: '1.25rem',
              transition: 'border-color 0.2s, background 0.2s',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                  fontSize: 15, color: 'var(--text)',
                }}>{label}</span>
                <span style={{
                  fontSize: 9, letterSpacing: '0.1em', color: 'var(--accent)',
                  background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)',
                  padding: '2px 8px', borderRadius: 999,
                }}>{tag}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/prs" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--accent)', color: '#fff',
            padding: '12px 24px', borderRadius: 8,
            fontSize: 14, fontFamily: 'var(--font-mono)',
            fontWeight: 500, textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Open PR Dashboard →
          </Link>
          <a href="https://github.com/manojkhatri63/gh-intel" target="_blank" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent', color: 'var(--muted)',
            padding: '12px 24px', borderRadius: 8,
            fontSize: 14, fontFamily: 'var(--font-mono)',
            fontWeight: 500, textDecoration: 'none',
            border: '1px solid var(--border)',
            transition: 'color 0.2s, border-color 0.2s',
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-bright)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
            }}
          >
            View on GitHub
          </a>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}