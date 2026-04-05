"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { MonitoringGrid } from "../components/MonitoringGrid";

export default function Dashboard() {
  const auth = useSelector((state: any) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!auth.accessToken) {
      router.push("/login");
    }
  }, [auth, router]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="headline" style={{ color: 'var(--primary)', fontSize: '2.5rem', fontWeight: '800' }}>
            COMMAND CENTER
          </h1>
          <p style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>
            NODE: {auth.venue_id?.toUpperCase() || 'OFFLINE'} | SECTOR: ALPHA-1
          </p>
        </div>
        <div className="glass pulse" style={{ padding: '10px 20px', borderRadius: '40px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', border: '1px solid rgba(183, 196, 255, 0.3)' }}>
          LIVE TELEMETRY STREAM
        </div>
      </div>

      <MonitoringGrid />
    </div>
  );
}
