"use client";

import { useSelector } from "react-redux";

export default function Settings() {
  const auth = useSelector((state: any) => state.auth);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="headline" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>SYSTEM SETTINGS</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure administrative and node-level parameters</p>
      </div>

      <div className="command-card glass" style={{ marginBottom: '2rem' }}>
        <h3 className="headline" style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>ADMINISTRATIVE PROFILE</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>ADMIN NAME</label>
            <p style={{ fontSize: '1rem', fontWeight: '500' }}>{auth.admin?.name || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>EMAIL ADDRESS</label>
            <p style={{ fontSize: '1rem', fontWeight: '500' }}>{auth.admin?.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="command-card glass">
        <h3 className="headline" style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>VENUE CONFIGURATION</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>VENUE ID</label>
            <p style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--primary)' }}>{auth.venue_id || 'N/A'}</p>
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>NODE STATUS</label>
            <p style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--success)' }}>ONLINE / ENCRYPTED</p>
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface-highest)', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Security tokens are rotated automatically every 15 minutes. Session persistence is managed via secure 7-day refresh cycles.
            </p>
        </div>
      </div>
    </div>
  );
}
