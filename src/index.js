import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import PosKds from './pos-kds';
import DbSelector from './DbSelector';
import UserMaster from './UserMaster';
import reportWebVitals from './reportWebVitals';

function AppRoot() {
  // Always default to empty so the "Connect to Database" page opens first!
  const [dbName, setDbName] = useState(() => {
    // If URL has ?db=..., clean the address bar immediately
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get('db');
      if (fromParam && fromParam.trim()) {
        const clean = fromParam.trim();
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return clean;
      }
    }
    return '';
  });

  const handleSelectDb = (newDb) => {
    const clean = (newDb || '').trim();
    if (!clean) return;

    localStorage.setItem('selected_db', clean);
    setDbName(clean);

    // Keep the address bar completely clean: https://poss-license.pages.dev/
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleClearDb = (newDb) => {
    if (typeof newDb === 'string' && newDb.trim()) {
      handleSelectDb(newDb.trim());
      return;
    }
    localStorage.removeItem('selected_db');
    setDbName('');
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // If no DB selected, ALWAYS show the "Connect to Database" page first!
  if (!dbName) {
    return <DbSelector onSelectDb={handleSelectDb} />;
  }

  const path = (window.location.pathname || '').toLowerCase();
  if (path === '/kds') {
    return <PosKds dbName={dbName} onDbChange={handleClearDb} />;
  }

  return <UserMaster dbName={dbName} onDbChange={handleClearDb} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);

reportWebVitals();
