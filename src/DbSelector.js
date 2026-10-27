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

  const connectTo = async (databaseName) => {
    const clean = (databaseName || '').trim();
    if (!clean) return;

    setError(null);

    // 1. Check if it matches an existing branch directly (case-insensitive)
    const matchedBranch = branches.find(
      (b) => (b.DatabaseName || '').toLowerCase().trim() === clean.toLowerCase()
    );

    const targetDb = matchedBranch ? matchedBranch.DatabaseName : clean;

    // If it's a known branch, proceed directly and smoothly
    if (matchedBranch) {
      setConnecting(true);
      localStorage.setItem('selected_db', targetDb);
      if (typeof onSelectDb === 'function') {
        onSelectDb(targetDb);
      } else {
        window.location.href = window.location.pathname;
      }
      return;
    }

    // 2. If it is NOT a listed branch, verify against SQL Server first
    // so non-existent DB names or typos are caught right here with friendly UI!
    setConnecting(true);
    try {
      await axios.get(`${BASE_URL}/api/usermaster`, {
        headers: { 'x-db-name': clean },
        timeout: 8000
      });

      // Verification succeeded!
      localStorage.setItem('selected_db', clean);
      if (typeof onSelectDb === 'function') {
        onSelectDb(clean);
      } else {
        window.location.href = window.location.pathname;
      }
    } catch (err) {
      console.warn(`Connection validation failed for "${clean}":`, err.message);
      setConnecting(false);
      localStorage.removeItem('selected_db');

      const isNotFound = err.response?.status === 404 || err.response?.data?.code === 'DB_NOT_FOUND';
      const serverMsg = err.response?.data?.message;

      setError({
        database: clean,
        message: serverMsg || (isNotFound
          ? `Database "${clean}" does not exist on SQL Server. Please enter the correct database name.`
          : `Cannot reach database "${clean}". Please check your network connection.`)
      });
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    connectTo(dbInput);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img src="/unipro-logo.png" alt="Unipro Softwares" style={styles.logoImg} />
        </div>
        <div style={styles.badge}>
          <span style={styles.badgeDot}></span>
          LICENSE MANAGEMENT v2.0
        </div>
        <h1 style={styles.title}>UNIPRO LICENSE MANAGEMENT</h1>
        <p style={styles.subtitle}>(CAFE, CLUB, CARWASH)</p>
        <p style={styles.helperText}>Enter the database name to continue</p>

        {/* DATABASE NOT FOUND / CONNECTION ERROR ALERT */}
        {error && (
          <div style={styles.errorAlert}>
            <div style={styles.errorHeader}>
              <span style={{ fontSize: '15px' }}>⚠️</span>
              <span>Database Connection Failed</span>
            </div>
            <p style={styles.errorText}>
              {error.message || `Database "${error.database}" does not exist on SQL Server. Please enter the correct database name.`}
            </p>
          </div>
        )}

        <form onSubmit={handleManualSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="e.g. UCS or UCSPONDY"
            value={dbInput}
            disabled={connecting}
            onChange={(e) => {
              setDbInput(e.target.value);
              if (error) setError(null);
            }}
            style={{
              ...styles.input,
              borderColor: error ? '#ef4444' : undefined,
              boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : undefined
            }}
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
            {connecting ? 'Checking Database...' : 'Connect Now'}
          </button>
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
    background: 'linear-gradient(135deg, #f0fdf9 0%, #f8fafc 100%)',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '2.5rem 2rem',
    borderRadius: '20px',
    boxShadow: '0 20px 40px -15px rgba(13, 105, 87, 0.12), 0 0 0 1px rgba(13, 105, 87, 0.08)',
    width: '100%',
    maxWidth: '460px',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  logoImg: {
    maxHeight: '68px',
    maxWidth: '220px',
    objectFit: 'contain'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#f0fdf9',
    border: '1px solid #a7f3d0',
    color: '#0d6957',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.06em',
    padding: '4px 12px',
    borderRadius: '20px',
    marginBottom: '10px',
    textTransform: 'uppercase'
  },
  badgeDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#10b981'
  },
  title: {
    margin: '0 0 0.35rem 0',
    fontSize: '1.45rem',
    fontWeight: '800',
    color: '#064e3b',
    lineHeight: '1.25',
    letterSpacing: '-0.3px'
  },
  subtitle: {
    margin: '0 0 0.4rem 0',
    color: '#d97706',
    fontSize: '0.88rem',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  helperText: {
    margin: '0 0 1.5rem 0',
    color: '#64748b',
    fontSize: '0.9rem'
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1.5px solid #f87171',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '16px',
    textAlign: 'left',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '800',
    color: '#b91c1c',
    marginBottom: '4px'
  },
  errorText: {
    margin: '0',
    fontSize: '12.5px',
    lineHeight: '1.4',
    color: '#7f1d1d'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem'
  },
  input: {
    padding: '0.85rem 1rem',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    width: '100%'
  },
  button: {
    padding: '0.9rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #0d6957 0%, #117a66 100%)',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    boxShadow: '0 4px 14px rgba(13, 105, 87, 0.25)'
  }
};
