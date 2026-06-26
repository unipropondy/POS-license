import React, { useState } from 'react';

export default function DbSelector() {
    const [db, setDb] = useState('');

    const handleConnect = (e) => {
        e.preventDefault();
        if (db.trim()) {
            localStorage.setItem('selected_db', db.trim());
            window.location.search = `?db=${db.trim()}`;
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Connect to Database</h1>
                <p style={styles.subtitle}>Enter the database name to continue</p>
                <form onSubmit={handleConnect} style={styles.form}>
                    <input
                        type="text"
                        placeholder="e.g. UCS or UCSPONDY"
                        value={db}
                        onChange={(e) => setDb(e.target.value)}
                        style={styles.input}
                        autoFocus
                    />
                    <button type="submit" style={styles.button}>
                        Connect Now
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f2f6',
        fontFamily: 'Inter, system-ui, sans-serif'
    },
    card: {
        background: 'white',
        padding: '3rem',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
    },
    title: {
        margin: '0 0 0.5rem 0',
        fontSize: '1.5rem',
        fontWeight: '800',
        color: '#2d3436'
    },
    subtitle: {
        margin: '0 0 2rem 0',
        color: '#636e72',
        fontSize: '0.9rem'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    input: {
        padding: '0.8rem 1rem',
        borderRadius: '8px',
        border: '2px solid #dfe6e9',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    button: {
        padding: '0.8rem',
        borderRadius: '8px',
        border: 'none',
        background: '#0984e3',
        color: 'white',
        fontSize: '1rem',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'background 0.2s'
    }
};
