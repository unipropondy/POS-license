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
        <div style={styles.badge}>
          <span style={styles.badgeDot}></span>
          Enterprise POS License
        </div>
        <h1 style={styles.title}>Connect to Database</h1>
        <p style={styles.subtitle}>Enter the database name to continue</p>

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
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.06em',
    padding: '3px 10px',
    borderRadius: '20px',
    marginBottom: '10px',
    textTransform: 'uppercase'
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#2563eb'
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
  }
};
