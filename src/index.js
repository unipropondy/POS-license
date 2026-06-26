import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// import App from './App';
import PosKds from './pos-kds';
import DbSelector from './DbSelector';
import UserMaster from './UserMaster';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Extract DB name from query parameter or localStorage
const getPageComponent = () => {
  const params = new URLSearchParams(window.location.search);
  let dbName = params.get('db');

  if (dbName) {
    localStorage.setItem('selected_db', dbName);
  } else {
    dbName = localStorage.getItem('selected_db');
  }

  // If still no db name, show selector
  if (!dbName) {
    return <DbSelector />;
  }

  const path = window.location.pathname.toLowerCase();
  if (path === '/kds') {
    return <PosKds dbName={dbName} />;
  }
  if (path === '/usermaster') {
    return <UserMaster dbName={dbName} />;
  }
  // Default to User Master
  return <UserMaster dbName={dbName} />;
};

root.render(
  <React.StrictMode>
    {getPageComponent()}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
