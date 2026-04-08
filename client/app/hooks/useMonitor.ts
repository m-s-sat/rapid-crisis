"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export const useMonitor = () => {
  const [sensorData, setSensorData] = useState<any>(null);
  const [activeCrisis, setActiveCrisis] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const auth = useSelector((state: any) => state.auth);
  const venueId = auth?.venue_id;

  useEffect(() => {
    if (!venueId) return;

    const wsAlerts = new WebSocket(`ws://127.0.0.1:3002?venue_id=${venueId}`);
    const wsSensor = new WebSocket(`ws://127.0.0.1:4000?venue_id=${venueId}`);

    wsAlerts.onopen = () => console.log(`🟢 [wsAlerts] Connected to 3002 for venue ${venueId}`);
    wsSensor.onopen = () => console.log(`🟢 [wsSensor] Connected to 4000 for venue ${venueId}`);

    wsSensor.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🟢 [wsSensor] RECEIVED DATA:", data);
        if (data.type === "sensor_data") {
          setSensorData(data.payload);
        }
      } catch (err) {
        console.error("WS Sensor Message Error:", err);
      }
    };

    wsAlerts.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔴 [wsAlerts] RECEIVED DATA:", data);
        if (data.type === "crisis_detected" || data.type === "crisis_update" || data.type === "decided_by_admin") {
          const payload = data.payload || data;
          setActiveCrisis(payload);
          setMessages((prev) => [{
            id: Date.now(),
            type: data.type === 'decided_by_admin' ? 'alert' : 'info',
            text: `Manual Review Required: ${payload.crisis_type} detected at ${payload.zone}`,
            time: new Date().toLocaleTimeString(),
            confidence: payload.confidence_score
          }, ...prev].slice(0, 50));
        } else if (data.type === "crisis_resolved" || data.type === "expired") {
          setActiveCrisis(null);
          
          if (data.type === "expired") {
            setMessages((prev) => [{
              id: Date.now(),
              type: 'info',
              text: data.message || `Timeout expired across decision window.`,
              time: new Date().toLocaleTimeString()
            }, ...prev].slice(0, 50));
          } else {
            setMessages((prev) => [{
              id: Date.now(),
              type: 'alert',
              text: `ALERT: ${data.payload?.crisis_type} detected at ${data.payload?.zone}`,
              time: new Date().toLocaleTimeString(),
              confidence: data.payload?.confidence_score
            }, ...prev].slice(0, 50));
          }
        } else if (data.type === "crisis_resolved") {
          setActiveCrisis(null);
          setMessages((prev) => [{
            id: Date.now(),
            type: 'info',
            text: data.message,
            time: new Date().toLocaleTimeString()
          }, ...prev].slice(0, 50));
        } else if (data.type === 'message_sent') {
             setMessages((prev) => [{
                id: Date.now(),
                type: 'success',
                text: `${data.message}`,
                time: new Date().toLocaleTimeString()
              }, ...prev].slice(0, 50));
        }
      } catch (err) {
        console.error("WS Alert Message Error:", err);
      }
    };

    return () => {
      // Delay closing until open to prevent React Strict Mode "closed before connection established" browser warnings
      if (wsAlerts.readyState === WebSocket.CONNECTING) {
        wsAlerts.addEventListener('open', () => wsAlerts.close());
      } else {
        wsAlerts.close();
      }
      
      if (wsSensor.readyState === WebSocket.CONNECTING) {
        wsSensor.addEventListener('open', () => wsSensor.close());
      } else {
        wsSensor.close();
      }
    };
  }, [venueId]);

  const handleAdminDecision = async (action: 'approve' | 'cancel', payload: any) => {
    try {
      const res = await fetch(`http://127.0.0.1:3002/api/admin/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      if (res.ok) {
        setActiveCrisis(null);
        setMessages((prev) => [{
          id: Date.now(),
          type: action === 'approve' ? 'success' : 'info',
          text: `Admin ${action}d the crisis alert.`,
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 50));
      } else {
        console.error("Failed to submit decision");
      }
    } catch (err) {
      console.error("Error submitting decision:", err);
    }
  };

  return { sensorData, activeCrisis, messages, handleAdminDecision };
};
