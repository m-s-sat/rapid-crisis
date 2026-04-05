"use client";

import { useSelector } from "react-redux";

export const Header = () => {
  const auth = useSelector((state: any) => state.auth);

  if (!auth.accessToken) return null;

  return (
    <header style={{ 
      height: '70px', 
      background: 'var(--surface)', 
      borderBottom: '1px solid rgba(255,255,255,0.05)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SYSTEM LIVE</span>
        </div>
        <h3 className="headline" style={{ fontSize: '1rem' }}>{auth.admin?.name || 'ADMINISTRATOR'}</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>HOSPITALITY NODE</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{auth.venue_id || 'LOCAL_UNIT_01'}</p>
        </div>
        
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <span style={{ fontSize: '1.4rem' }}>🔔</span>
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', background: 'var(--error)', borderRadius: '50%', border: '2px solid var(--surface)' }} />
        </div>
      </div>
    </header>
  );
};
