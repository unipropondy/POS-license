import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import PosKds from './pos-kds';
import DbSelector from './DbSelector';
import UserMaster from './UserMaster';
import reportWebVitals from './reportWebVitals';

const DEFAULT_DATABASE = process.env.REACT_APP_DEFAULT_DB || 'UCSCONESTONE';

function AppRoot() {
  const [showSelector, setShowSelector] = useState(false);

  const [dbName, setDbName] = useState(() => {
    if (typeof window !== 'undefined') {
      // 1. Check URL query param (?db=...)
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get('db');
      if (fromParam && fromParam.trim()) {
        const clean = fromParam.trim();
        localStorage.setItem('selected_db', clean);
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return clean;
      }

      // 2. Check localStorage
      const cached = localStorage.getItem('selected_db');
      if (cached && cached.trim()) {
        return cached.trim();
      }
    }

    // 3. Default to UCSCONESTONE so UserMaster loads directly on visit
    localStorage.setItem('selected_db', DEFAULT_DATABASE);
    return DEFAULT_DATABASE;
  });

  const handleSelectDb = (newDb) => {
    const clean = (newDb || '').trim() || DEFAULT_DATABASE;
    localStorage.setItem('selected_db', clean);
    setDbName(clean);
    setShowSelector(false);

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleOpenSelector = () => {
    setShowSelector(true);
  };

  // If user explicitly clicked CHANGE, show the branch database picker
  if (showSelector) {
    return <DbSelector onSelectDb={handleSelectDb} />;
  }

  const path = (window.location.pathname || '').toLowerCase();
  if (path === '/kds') {
    return <PosKds dbName={dbName} onDbChange={handleOpenSelector} />;
  }

  // Default: Open the UserMaster page immediately!
  return <UserMaster dbName={dbName} onDbChange={handleOpenSelector} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);

reportWebVitals();
