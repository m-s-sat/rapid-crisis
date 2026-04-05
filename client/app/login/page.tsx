"use client";

import { useState } from "react";
import { useLoginMutation } from "../../lib/features/auth/authApiSlice";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../lib/features/auth/authSlice";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 150px)', padding: '2rem' }}>
      <div className="command-card glass" style={{ maxWidth: '450px', width: '100%', padding: '3rem' }}>
        <h1 className="headline" style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary)' }}>SENTINEL ACCESS</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Authorized Personnel Only</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="email" 
              placeholder="Admin Email" 
              required 
              style={{ width: '100%' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              placeholder="Password" 
              required 
              style={{ width: '100%' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', textAlign: 'center' }}>{(error as any).data?.message || 'Access Denied'}</p>}

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '16px' }} disabled={isLoading}>
            {isLoading ? "AUTHENTICATING..." : "ENTER COMMAND CENTER"}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          New Venue? <span onClick={() => router.push('/register')} style={{ color: 'var(--primary)', cursor: 'pointer' }}>Register System</span>
        </p>
      </div>
    </div>
  );
}
