"use client";

import { useState } from "react";
import { useGetGuestsQuery, useCreateGuestMutation, useCheckOutGuestMutation } from "../../../lib/features/guest/guestApiSlice";

export default function GuestRegistry() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: "", room_id: "", phoneNumber: "" });

  const { data, isLoading } = useGetGuestsQuery({ page });
  const [createGuest] = useCreateGuestMutation();
  const [checkOutGuest] = useCheckOutGuestMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createGuest(newGuest).unwrap();
    setShowForm(false);
    setNewGuest({ name: "", room_id: "", phoneNumber: "" });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="headline" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>GUEST REGISTRY</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live occupancy and check-in management</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ NEW CHECK-IN</button>
      </div>

      {showForm && (
        <div className="command-card glass" style={{ marginBottom: '2rem', border: '1px solid var(--primary-container)' }}>
          <h3 className="headline" style={{ fontSize: '0.8rem', marginBottom: '1.2rem', color: 'var(--text-primary)' }}>RECEPTIONIST FORUM</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>GUEST NAME</label>
              <input style={{ width: '100%' }} value={newGuest.name} onChange={e => setNewGuest({ ...newGuest, name: e.target.value })} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>ROOM / ID</label>
              <input style={{ width: '100%' }} value={newGuest.room_id} onChange={e => setNewGuest({ ...newGuest, room_id: e.target.value })} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>PHONE</label>
              <input style={{ width: '100%' }} value={newGuest.phoneNumber} onChange={e => setNewGuest({ ...newGuest, phoneNumber: e.target.value })} required />
            </div>
            <button type="submit" className="btn-primary">REGISTER</button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>CANCEL</button>
          </form>
        </div>
      )}

      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-high)' }}>
              <th style={{ padding: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>GUEST</th>
              <th style={{ padding: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ROOM / ID</th>
              <th style={{ padding: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>STATUS</th>
              <th style={{ padding: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {data?.guests.map((guest: any) => (
              <tr key={guest._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1.2rem', fontSize: '0.9rem', fontWeight: '500' }}>{guest.name}</td>
                <td style={{ padding: '1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{guest.room_id}</td>
                <td style={{ padding: '1.2rem' }}>
                    <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        fontSize: '0.7rem', 
                        background: guest.status === 'active' ? 'rgba(34,197,94,0.1)' : 'var(--surface-highest)', 
                        color: guest.status === 'active' ? 'var(--success)' : 'var(--text-secondary)',
                        fontWeight: '700'
                    }}>
                        {guest.status.toUpperCase()}
                    </span>
                </td>
                <td style={{ padding: '1.2rem' }}>
                  {guest.status === 'active' && (
                    <button style={{ color: 'var(--primary)', background: 'transparent' }} onClick={() => checkOutGuest(guest._id)}>CHECK OUT</button>
                  )}
                  {guest.status === 'checked_out' && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ARCHIVED</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button 
            disabled={page === 1} 
            className="btn-ghost" 
            onClick={() => setPage(p => p - 1)}
            style={{ opacity: page === 1 ? 0.3 : 1 }}
        >
            PREVIOUS
        </button>
        <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>PAGE {page} OF {data?.totalPages || 1}</span>
        <button 
            disabled={page === data?.totalPages} 
            className="btn-ghost" 
            onClick={() => setPage(p => p + 1)}
            style={{ opacity: page === (data?.totalPages || 1) ? 0.3 : 1 }}
        >
            NEXT
        </button>
      </div>
    </div>
  );
}
