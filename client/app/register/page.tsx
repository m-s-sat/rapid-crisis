"use client";

import { useState } from "react";
import { useRegisterMutation } from "../../lib/features/auth/authApiSlice";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../lib/features/auth/authSlice";
import { useRouter } from "next/navigation";

export default function Register() {
  const [formData, setFormData] = useState({
    venueName: "",
    location: "",
    hospitality_type: "Hotel",
    contact_number: "",
    adminName: "",
    email: "",
    password: "",
  });

  const [register, { isLoading, error }] = useRegisterMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await register(formData).unwrap();
      dispatch(setCredentials(result));
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 150px)', padding: '2rem' }}>
      <div className="command-card glass" style={{ maxWidth: '600px', width: '100%' }}>
        <h1 className="headline" style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>SENTINEL COMMAND</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Initialize your hospitality security protocols</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <h3 className="headline" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Venue Information</h3>
          </div>
          
          <input name="venueName" placeholder="Venue Name" required onChange={handleChange} />
          <input name="location" placeholder="Location" required onChange={handleChange} />
          
          <select name="hospitality_type" value={formData.hospitality_type} onChange={handleChange}>
            <option value="Hotel">Hotel</option>
            <option value="Hospital">Hospital</option>
            <option value="Resort">Resort</option>
            <option value="Resort & Spa">Resort & Spa</option>
            <option value="Shopping Mall">Shopping Mall</option>
            <option value="Other">Other</option>
          </select>
          
          <input name="contact_number" placeholder="Contact Number" required onChange={handleChange} />

          <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <h3 className="headline" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Credentials</h3>
          </div>

          <input name="adminName" placeholder="Full Name" required onChange={handleChange} />
          <input name="email" type="email" placeholder="Email Address" required onChange={handleChange} />
          
          <input name="password" type="password" placeholder="Password" required style={{ gridColumn: 'span 2' }} onChange={handleChange} />

          {error && <p style={{ color: 'var(--error)', gridColumn: 'span 2', fontSize: '0.85rem' }}>{(error as any).data?.message || 'Registration failed'}</p>}

          <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem' }} disabled={isLoading}>
            {isLoading ? "INITIALIZING..." : "REGISTER COMMANDER"}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have access? <span onClick={() => router.push('/login')} style={{ color: 'var(--primary)', cursor: 'pointer' }}>Login</span>
        </p>
      </div>
    </div>
  );
}
