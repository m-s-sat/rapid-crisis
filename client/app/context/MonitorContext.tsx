"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { useSelector } from "react-redux";

interface MonitorMessage {
  id: number;
  type: "alert" | "info" | "success";
  text: string;
  time: string;
  confidence?: number;
}

interface MonitorContextValue {
  sensorData: any;
  activeCrisis: any;
  messages: MonitorMessage[];
  handleAdminDecision: (action: "approve" | "cancel", payload: any) => Promise<void>;
  isPaused: boolean;
  pauseTimeRemaining: number;
}

const MonitorContext = createContext<MonitorContextValue>({
  sensorData: null,
  activeCrisis: null,
  messages: [],
  handleAdminDecision: async () => {},
  isPaused: false,
  pauseTimeRemaining: 0,
});

export const useMonitorContext = () => useContext(MonitorContext);

export const MonitorProvider = ({ children }: { children: ReactNode }) => {
  const [sensorData, setSensorData] = useState<any>(null);
  const [activeCrisis, setActiveCrisis] = useState<any>(null);
  const [messages, setMessages] = useState<MonitorMessage[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseTimeRemaining, setPauseTimeRemaining] = useState(0);

  const auth = useSelector((state: any) => state.auth);
  const venueId = auth?.venue_id;

  const wsAlertsRef = useRef<WebSocket | null>(null);
  const wsSensorRef = useRef<WebSocket | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const connectedVenueRef = useRef<string | null>(null);

  const addMessage = useCallback((msg: Omit<MonitorMessage, "id">) => {
    setMessages((prev) => [{ ...msg, id: Date.now() + Math.random() }, ...prev].slice(0, 50));
  }, []);

  const startCountdown = useCallback((durationMs: number) => {
    setIsPaused(true);
    setPauseTimeRemaining(durationMs);

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setPauseTimeRemaining((prev) => {
        if (prev <= 1000) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setIsPaused(false);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    setIsPaused(false);
    setPauseTimeRemaining(0);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleAdminDecision = useCallback(async (action: "approve" | "cancel", payload: any) => {
    try {
      const res = await fetch(`http://127.0.0.1:3002/api/admin/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        setActiveCrisis(null);
        addMessage({
          type: action === "approve" ? "success" : "info",
          text: `Admin ${action === "approve" ? "approved" : "cancelled"} the crisis alert.`,
          time: new Date().toLocaleTimeString(),
        });
      }
    } catch (err) {
      console.error("Error submitting decision:", err);
    }
  }, [addMessage]);

  useEffect(() => {
    if (!venueId) return;
    if (connectedVenueRef.current === venueId && wsAlertsRef.current && wsSensorRef.current) return;

    if (wsAlertsRef.current) wsAlertsRef.current.close();
    if (wsSensorRef.current) wsSensorRef.current.close();

    connectedVenueRef.current = venueId;

    const wsAlerts = new WebSocket(`ws://127.0.0.1:3002?venue_id=${venueId}`);
    const wsSensor = new WebSocket(`ws://127.0.0.1:4000?venue_id=${venueId}`);
    wsAlertsRef.current = wsAlerts;
    wsSensorRef.current = wsSensor;

    wsSensor.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "sensor_data") {
          setSensorData(data.payload);
        } else if (data.type === "telemetry_paused") {
          startCountdown(data.duration_ms || 15 * 60 * 1000);
        } else if (data.type === "telemetry_resumed") {
          stopCountdown();
        }
      } catch (err) {
        console.error("WS Sensor Message Error:", err);
      }
    };

    wsAlerts.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "crisis_detected" || data.type === "crisis_update" || data.type === "decided_by_admin") {
          const payload = data.payload || data;
          setActiveCrisis(payload);
          addMessage({
            type: data.type === "decided_by_admin" ? "alert" : "info",
            text: `Manual Review Required: ${payload.crisis_type} detected at ${payload.zone || (payload.zones ? payload.zones[0] : "unknown")}`,
            time: new Date().toLocaleTimeString(),
            confidence: payload.confidence_score,
          });
        } else if (data.type === "expired") {
          setActiveCrisis(null);
          addMessage({
            type: "info",
            text: data.message || "Timeout expired across decision window.",
            time: new Date().toLocaleTimeString(),
          });
        } else if (data.type === "crisis_resolved") {
          setActiveCrisis(null);
          addMessage({
            type: "info",
            text: data.message || `${data.crisis_type || "Crisis"} has been auto-resolved.`,
            time: new Date().toLocaleTimeString(),
          });
        } else if (data.type === "message_sent") {
          addMessage({
            type: "success",
            text: data.message || "Crisis alerts dispatched to all registered contacts.",
            time: new Date().toLocaleTimeString(),
          });
        } else if (data.type === "pause_started") {
          startCountdown(data.duration_ms || 15 * 60 * 1000);
        } else if (data.type === "pause_ended") {
          stopCountdown();
        }
      } catch (err) {
        console.error("WS Alert Message Error:", err);
      }
    };

    wsSensor.onclose = () => {
      if (connectedVenueRef.current === venueId) {
        wsSensorRef.current = null;
      }
    };

    wsAlerts.onclose = () => {
      if (connectedVenueRef.current === venueId) {
        wsAlertsRef.current = null;
      }
    };

    return () => {
      connectedVenueRef.current = null;

      if (wsAlerts.readyState === WebSocket.CONNECTING) {
        wsAlerts.addEventListener("open", () => wsAlerts.close());
      } else {
        wsAlerts.close();
      }
      if (wsSensor.readyState === WebSocket.CONNECTING) {
        wsSensor.addEventListener("open", () => wsSensor.close());
      } else {
        wsSensor.close();
      }

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [venueId, addMessage, startCountdown, stopCountdown]);

  return (
    <MonitorContext.Provider
      value={{ sensorData, activeCrisis, messages, handleAdminDecision, isPaused, pauseTimeRemaining }}
    >
      {children}
    </MonitorContext.Provider>
  );
};
