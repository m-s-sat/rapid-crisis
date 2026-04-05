"use client";

import { useState } from "react";
import { useGetStaffQuery, useCreateStaffMutation, useDeleteStaffMutation } from "../../../lib/features/staff/staffApiSlice";

export default function StaffDirectory() {
  const [page, setPage] = useState(1);
  const [expertise, setExpertise] = useState("all");
  const [showForm, setShowForm] = useState(false);
  
  const [newStaff, setNewStaff] = useState({ name: "", phoneNumber: "", expertise: "fire" });

  const { data, isLoading } = useGetStaffQuery({ page, expertise });
  const [createStaff] = useCreateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createStaff(newStaff).unwrap();
    setShowForm(false);
    setNewStaff({ name: "", phoneNumber: "", expertise: "fire" });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="headline" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>STAFF DIRECTORY</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Crisis response personnel registry</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ REGISTER STAFF</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['all', 'fire', 'security', 'medical'].map((exp) => (
          <button 
            key={exp}
            onClick={() => { setExpertise(exp); setPage(1); }}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '20px', 
              fontSize: '0.8rem',
              background: expertise === exp ? 'var(--primary)' : 'var(--surface-high)',
              color: expertise === exp ? 'var(--on-primary)' : 'var(--text-secondary)'
            }}
          >
            {exp.toUpperCase()}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="command-card glass" style={{ marginBottom: '2rem', border: '1px solid var(--primary-container)' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>NAME</label>
              <input style={{ width: '100%' }} value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>PHONE</label>
              <input style={{ width: '100%' }} value={newStaff.phoneNumber} onChange={e => setNewStaff({ ...newStaff, phoneNumber: e.target.value })} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>EXPERTISE</label>
              <select style={{ width: '100%' }} value={newStaff.expertise} onChange={e => setNewStaff({ ...newStaff, expertise: e.target.value as any })}>
                <option value="fire">FIRE</option>
                <option value="security">SECURITY</option>
                <option value="medical">MEDICAL</option>
                <option value="all">ALL</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">SAVE</button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>CANCEL</button>
          </form>
        </div>
      )}

      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-high)' }}>
              <th style={{ padding: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>NAME</th>
              <th style={{ padding: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PHONE</th>
              <th style={{ padding: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>EXPERTISE</th>
              <th style={{ padding: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {data?.staff.map((staff: any) => (
              <tr key={staff._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1.2rem', fontSize: '0.9rem', fontWeight: '500' }}>{staff.name}</td>
                <td style={{ padding: '1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{staff.phoneNumber}</td>
                <td style={{ padding: '1.2rem' }}>
                    <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        fontSize: '0.7rem', 
                        background: 'var(--surface-highest)', 
                        color: 'var(--primary)',
                        fontWeight: '700'
                    }}>
                        {staff.expertise.toUpperCase()}
                    </span>
                </td>
                <td style={{ padding: '1.2rem' }}>
                  <button style={{ color: 'var(--error)', background: 'transparent' }} onClick={() => deleteStaff(staff._id)}>REMOVE</button>
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
