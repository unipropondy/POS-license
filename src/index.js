import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import PosKds from './pos-kds';
import DbSelector from './DbSelector';
import UserMaster from './UserMaster';
import reportWebVitals from './reportWebVitals';

function AppRoot() {
  const [dbName, setDbName] = useState(() => {
    // 1. Check URL search param (?db=UCSKINDEE)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get('db');
      if (fromParam && fromParam.trim()) {
        const clean = fromParam.trim();
        localStorage.setItem('selected_db', clean);
        return clean;
      }
      // 2. Check localStorage
      const cached = localStorage.getItem('selected_db');
      if (cached && cached.trim()) {
        return cached.trim();
      }
    }
    return '';
  });

  // Listen to popstate or direct URL changes if needed
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const urlDb = params.get('db');
      if (urlDb && urlDb.trim()) {
        localStorage.setItem('selected_db', urlDb.trim());
        setDbName(urlDb.trim());
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const handleSelectDb = (newDb) => {
    const clean = (newDb || '').trim();
    localStorage.setItem('selected_db', clean);
    setDbName(clean);

    // Keep the URL clean or in sync without triggering a reload
    if (window.history && window.history.replaceState) {
      const newUrl = clean
        ? `${window.location.pathname}?db=${encodeURIComponent(clean)}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  };

  const handleClearDb = () => {
    localStorage.removeItem('selected_db');
    setDbName('');
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // If no DB selected, show selector
  if (!dbName) {
    return <DbSelector onSelectDb={handleSelectDb} />;
  }

  const path = (window.location.pathname || '').toLowerCase();
  if (path === '/kds') {
    return <PosKds dbName={dbName} onDbChange={handleClearDb} />;
  }

  // Default to UserMaster
  return <UserMaster dbName={dbName} onDbChange={handleClearDb} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);

reportWebVitals();
