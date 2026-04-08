"use client";

import { useMonitor } from "../hooks/useMonitor";

export const MonitoringGrid = () => {
  const { sensorData, activeCrisis, messages, handleAdminDecision } = useMonitor();

  const sensors = sensorData?.sensors;
  const sensorStats = [
    { label: "Temperature", value: sensors?.temperature_c !== undefined ? `${sensors.temperature_c.toFixed(1)}°C` : "--", color: "#60a5fa" },
    { label: "Humidity", value: sensors?.humidity_pct !== undefined ? `${sensors.humidity_pct.toFixed(1)}%` : "--", color: "#818cf8" },
    { label: "Smoke Level", value: sensors?.smoke_ppm !== undefined ? `${sensors.smoke_ppm.toFixed(0)} ppm` : "--", color: "#f87171" },
    { label: "Air Quality (AQI)", value: sensors?.air_quality_index !== undefined ? `${sensors.air_quality_index.toFixed(0)}` : "--", color: "#a78bfa" },
    { label: "CO2 Level", value: sensors?.co2_ppm !== undefined ? `${sensors.co2_ppm.toFixed(0)} ppm` : "--", color: "#fb923c" },
    { label: "CO Level", value: sensors?.co_ppm !== undefined ? `${sensors.co_ppm.toFixed(1)} ppm` : "--", color: "#f43f5e" },
    { label: "Gas LPG", value: sensors?.gas_lpg_ppm !== undefined ? `${sensors.gas_lpg_ppm.toFixed(1)} ppm` : "--", color: "#ea580c" },
    { label: "Gas Methane", value: sensors?.gas_methane_ppm !== undefined ? `${sensors.gas_methane_ppm.toFixed(1)} ppm` : "--", color: "#d97706" },
    { label: "Sound Level", value: sensors?.sound_db !== undefined ? `${sensors.sound_db.toFixed(1)} dB` : "--", color: "#2dd4bf" },
    { label: "Vibration", value: sensors?.vibration_g !== undefined ? `${sensors.vibration_g.toFixed(2)} g` : "--", color: "#eab308" },
    { label: "Water Level", value: sensors?.water_level_cm !== undefined ? `${sensors.water_level_cm.toFixed(1)} cm` : "--", color: "#34d399" },
    { label: "Presence", value: sensors?.motion_detected ? "DETECTED" : "NONE", color: sensors?.motion_detected ? "#fbbf24" : "var(--text-secondary)" },
    { label: "Flame Detected", value: sensors?.flame_detected ? "WARN" : "SAFE", color: sensors?.flame_detected ? "#ef4444" : "var(--text-secondary)" },
    { label: "Moisture", value: sensors?.moisture_detected ? "WARN" : "SAFE", color: sensors?.moisture_detected ? "#3b82f6" : "var(--text-secondary)" },
    { label: "Door Status", value: sensors?.door_open ? "OPEN" : "CLOSED", color: sensors?.door_open ? "#fbbf24" : "var(--text-secondary)" },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', height: '100%', minHeight: '600px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Sensor Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {sensorStats.map((stat, i) => (
            <div key={i} className="command-card glass" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{stat.label}</p>
              <h2 style={{ color: stat.color, fontSize: '1.4rem', fontWeight: 'bold' }}>{stat.value}</h2>
            </div>
          ))}
        </div>

        {/* Active Crisis Alert Area */}
        {activeCrisis && (
          <div className="command-card" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            padding: '2rem',
            animation: 'pulse 2s infinite ease-in-out'
          }}>
            <h1 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>CRISIS DETECTED: {activeCrisis.crisis_type || (activeCrisis.crisis_details ? activeCrisis.crisis_details.type : "Unknown")}</h1>
            <p style={{ color: 'var(--text-primary)' }}>Zone: {activeCrisis.zone || (activeCrisis.zones ? activeCrisis.zones[0] : "unknown")} | Confidence: {(activeCrisis.confidence_score * 100).toFixed(0)}%</p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              {activeCrisis.confidence_score < 0.7 && (
                <>
                   <button className="btn-primary" style={{ background: '#ef4444', color: '#fff' }} onClick={() => handleAdminDecision('approve', activeCrisis)}>ACTIVATE PROTOCOL</button>
                   <button className="btn-ghost" onClick={() => handleAdminDecision('cancel', activeCrisis)}>FALSE ALARM</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* System Activity Hub */}
        <div className="command-card glass" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>SYSTEM ACTIVITY HUB</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Monitoring protocols active. Awaiting telemetry data...</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{ 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '8px',
                  borderLeft: `4px solid ${msg.type === 'alert' ? '#ef4444' : msg.type === 'success' ? '#22c55e' : '#60a5fa'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.time}</span>
                    {msg.confidence && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{Math.round(msg.confidence * 100)}% Match</span>}
                  </div>
                  <p style={{ fontSize: '0.9rem' }}>{msg.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Side Control / Info Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div className="command-card glass">
            <h4 style={{ marginBottom: '1rem' }}>NODE STATUS</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></div>
                <span style={{ fontSize: '0.9rem' }}>IoT Sensor Node Online</span>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#60a5fa' }}></div>
                <span style={{ fontSize: '0.9rem' }}>Gateway Linked</span>
            </div>
         </div>

         <div className="command-card glass">
            <h4 style={{ marginBottom: '1rem' }}>PROTOCOL 7</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Sentinel Command is currently operating in Automated Response mode. Confidence scores above 70% will trigger immediate guest notification.
            </p>
         </div>
      </div>
    </div>
  );
};
