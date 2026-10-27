import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from './config/api';

export default function DbSelector({ onSelectDb }) {
  const [dbInput, setDbInput] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

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
          console.warn('Could not load BranchDatabaseMaster automatically:', err.message);
          setError('Could not automatically retrieve branch list from server.');
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

  const filteredBranches = branches.filter((b) => {
    const term = filter.toLowerCase();
    return (
      (b.DatabaseName && b.DatabaseName.toLowerCase().includes(term)) ||
      (b.BranchCode && b.BranchCode.toLowerCase().includes(term))
    );
  });

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>🏢</div>
          <h1 style={styles.title}>Select Branch Database</h1>
          <p style={styles.subtitle}>
            Choose a database from <strong>BranchDatabaseMaster</strong> or enter manually.
          </p>
        </div>

        {/* Database List from BranchDatabaseMaster */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Available Databases</span>
            {branches.length > 0 && (
              <span style={styles.branchCount}>{branches.length} Branches</span>
            )}
          </div>

          {loading ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Loading databases from BranchDatabaseMaster...
              </p>
            </div>
          ) : branches.length > 0 ? (
            <>
              {branches.length > 4 && (
                <input
                  type="text"
                  placeholder="🔍 Search database or branch code..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={styles.filterInput}
                />
              )}
              <div style={styles.grid}>
                {filteredBranches.map((b) => (
                  <button
                    key={b.BranchCode || b.DatabaseName}
                    type="button"
                    disabled={connecting}
                    onClick={() => connectTo(b.DatabaseName)}
                    style={styles.branchButton}
                    title={`Connect to ${b.DatabaseName} (${b.BranchCode})`}
                  >
                    <div style={styles.branchCodeBadge}>{b.BranchCode}</div>
                    <div style={styles.branchDbName}>{b.DatabaseName}</div>
                    <div style={styles.connectArrow}>➔</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            error && (
              <div style={styles.warningBox}>
                <span>⚠️ {error}</span>
              </div>
            )
          )}
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>OR ENTER MANUALLY</span>
        </div>

        {/* Manual Input Form */}
        <form onSubmit={handleManualSubmit} style={styles.form}>
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

          <div style={styles.inputRow}>
            <input
              type="text"
              placeholder="e.g. UCSKINDEE or UCSPONDY"
              value={dbInput}
              disabled={connecting}
              onChange={(e) => setDbInput(e.target.value)}
              style={styles.input}
            />
            <button
              type="submit"
              disabled={!dbInput.trim() || connecting}
              style={{
                ...styles.connectBtn,
                opacity: dbInput.trim() && !connecting ? 1 : 0.6,
                cursor: dbInput.trim() && !connecting ? 'pointer' : 'not-allowed'
              }}
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
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
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '20px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
    width: '100%',
    maxWidth: '560px',
    padding: '36px',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  iconCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '16px',
    background: '#f0fdf4',
    border: '2px solid #bbf7d0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    margin: '0 auto 14px'
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.88rem',
    lineHeight: 1.5
  },
  section: {
    marginTop: '16px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#64748b'
  },
  branchCount: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#0369a1',
    background: '#e0f2fe',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '3px solid #cbd5e1',
    borderTopColor: '#0284c7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  filterInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    marginBottom: '12px',
    boxSizing: 'border-box',
    outline: 'none'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '10px',
    maxHeight: '260px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  branchButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease'
  },
  branchCodeBadge: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#475569',
    background: '#e2e8f0',
    padding: '3px 6px',
    borderRadius: '6px',
    marginRight: '8px',
    letterSpacing: '0.03em'
  },
  branchDbName: {
    flex: 1,
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  connectArrow: {
    fontSize: '13px',
    color: '#0284c7',
    marginLeft: '6px'
  },
  warningBox: {
    padding: '12px',
    background: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#92400e',
    textAlign: 'center'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '22px 0 16px'
  },
  dividerText: {
    width: '100%',
    borderBottom: '1px solid #e2e8f0',
    lineHeight: '0.1em',
    color: '#94a3b8',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  suggestionAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '12px',
    fontSize: '12px',
    color: '#166534'
  },
  suggestionBtn: {
    background: '#15803d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  inputRow: {
    display: 'flex',
    gap: '10px'
  },
  input: {
    flex: 1,
    padding: '11px 14px',
    borderRadius: '10px',
    border: '2px solid #cbd5e1',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box'
  },
  connectBtn: {
    padding: '11px 22px',
    borderRadius: '10px',
    border: 'none',
    background: '#0284c7',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
    transition: 'background 0.15s ease'
  }
};
