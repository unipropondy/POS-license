import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from './config/api';

export default function DbSelector({ onSelectDb }) {
  const [dbInput, setDbInput] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${BASE_URL}/api/branchdatabasemaster`, {
          timeout: 10000
        });
        if (isMounted) {
          if (Array.isArray(res.data)) {
            setBranches(res.data);
          } else {
            setBranches([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Could not load BranchDatabaseMaster:', err.message);
          setError('Could not load branch list from server.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBranches();
    return () => { isMounted = false; };
  }, []);

  const connectTo = (databaseName) => {
    const clean = (databaseName || '').trim();
    if (!clean) return;

    setConnecting(true);
    localStorage.setItem('selected_db', clean);

    if (typeof onSelectDb === 'function') {
      onSelectDb(clean);
    } else {
      window.location.href = window.location.pathname;
    }
  };

  // Find spelling suggestion if typed name isn't an exact match
  const getManualSuggestion = () => {
    if (!dbInput.trim() || branches.length === 0) return null;
    const cleanTarget = dbInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const exact = branches.some((b) => (b.DatabaseName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanTarget);
    if (exact) return null;

    let bestMatch = null;
    let minDistance = 999;

    branches.forEach((b) => {
      const candidate = (b.DatabaseName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (candidate.includes(cleanTarget) || cleanTarget.includes(candidate)) {
        bestMatch = b.DatabaseName;
        minDistance = 1;
      }
    });

    if (bestMatch) return bestMatch;

    const lev = (a, b) => {
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          dp[i][j] = a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
      return dp[m][n];
    };

    branches.forEach((b) => {
      const candidate = (b.DatabaseName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const dist = lev(cleanTarget, candidate);
      if (dist < minDistance && dist <= 3) {
        minDistance = dist;
        bestMatch = b.DatabaseName;
      }
    });

    return bestMatch;
  };

  const manualSuggestion = getManualSuggestion();

  const handleManualSubmit = (e) => {
    e.preventDefault();
    connectTo(dbInput);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Connect to Database</h1>
        <p style={styles.subtitle}>Enter the database name to continue</p>

        {manualSuggestion && (
          <div style={styles.suggestionAlert}>
            <span>💡 Did you mean <strong>{manualSuggestion}</strong>?</span>
            <button
              type="button"
              onClick={() => {
                setDbInput(manualSuggestion);
                connectTo(manualSuggestion);
              }}
              style={styles.suggestionBtn}
            >
              Use {manualSuggestion}
            </button>
          </div>
        )}

        <form onSubmit={handleManualSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="e.g. UCS or UCSPONDY"
            value={dbInput}
            disabled={connecting}
            onChange={(e) => setDbInput(e.target.value)}
            style={styles.input}
            autoFocus
          />
          <button
            type="submit"
            disabled={!dbInput.trim() || connecting}
            style={{
              ...styles.button,
              opacity: dbInput.trim() && !connecting ? 1 : 0.6,
              cursor: dbInput.trim() && !connecting ? 'pointer' : 'not-allowed'
            }}
          >
            {connecting ? 'Connecting...' : 'Connect Now'}
          </button>
        </form>

        {/* Quick select from BranchDatabaseMaster */}
        {branches.length > 0 && (
          <div style={styles.branchSection}>
            <div style={styles.divider}>
              <span style={styles.dividerText}>OR SELECT A BRANCH</span>
            </div>
            <div style={styles.chipGrid}>
              {branches.map((b) => (
                <button
                  key={b.BranchCode || b.DatabaseName}
                  type="button"
                  disabled={connecting}
                  onClick={() => connectTo(b.DatabaseName)}
                  style={styles.chip}
                  title={`Connect to ${b.DatabaseName}`}
                >
                  <span style={styles.chipCode}>{b.BranchCode}</span>
                  <span style={styles.chipName}>{b.DatabaseName}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f2f6',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
    width: '100%',
    maxWidth: '440px',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.6rem',
    fontWeight: '800',
    color: '#2d3436'
  },
  subtitle: {
    margin: '0 0 1.5rem 0',
    color: '#636e72',
    fontSize: '0.95rem'
  },
  suggestionAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '8px 12px',
    marginBottom: '14px',
    fontSize: '12px',
    color: '#166534'
  },
  suggestionBtn: {
    background: '#15803d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem'
  },
  input: {
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    border: '2px solid #dfe6e9',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    width: '100%'
  },
  button: {
    padding: '0.85rem',
    borderRadius: '8px',
    border: 'none',
    background: '#0984e3',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s',
    width: '100%'
  },
  branchSection: {
    marginTop: '1.5rem'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '1.2rem 0'
  },
  dividerText: {
    width: '100%',
    borderBottom: '1px solid #edf2f7',
    lineHeight: '0.1em',
    color: '#a0aec0',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  chipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    maxHeight: '180px',
    overflowY: 'auto'
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease'
  },
  chipCode: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#64748b',
    background: '#e2e8f0',
    padding: '2px 5px',
    borderRadius: '4px'
  },
  chipName: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginLeft: '6px'
  }
};
