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

    const ws = new WebSocket(`ws://localhost:3000?venue_id=${venueId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "sensor_data") {
          setSensorData(data.payload);
        } else if (data.type === "crisis_detected" || data.type === "crisis_update") {
          setActiveCrisis(data.payload);
          setMessages((prev) => [{
            id: Date.now(),
            type: 'alert',
            text: `ALERT: ${data.payload.crisis_type} detected at ${data.payload.zone}`,
            time: new Date().toLocaleTimeString(),
            confidence: data.payload.confidence_score
          }, ...prev].slice(0, 50));
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
        console.error("WS Message Error:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [venueId]);

  return { sensorData, activeCrisis, messages };
};
