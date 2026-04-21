"use client";

import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { MonitoringGrid } from "../components/MonitoringGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, PowerOff, Activity } from "lucide-react";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const auth = useSelector((state: any) => state.auth);
  const router = useRouter();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    if (auth.isInitialized && !auth.accessToken) {
      router.push("/login");
    }
  }, [auth.accessToken, auth.isInitialized, router]);

  const sendHeartbeat = async () => {
    try {
      await fetch("http://localhost:4000/api/simulator/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("Heartbeat failed");
    }
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 10000);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    // Explicitly terminate the session on the backend to stop data transfer immediately
    fetch("http://localhost:4000/api/simulator/terminate", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).catch(err => console.error("Termination failed", err));
  };

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  if (!mounted || !auth.isInitialized) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <div className="text-primary italic animate-pulse tracking-widest font-bold">
          INITIALIZING SECURE SESSION...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 text-foreground">
      <div className="mb-8 flex items-end justify-between border-b border-border/40 pb-6">
        <div>
          <h1 className="headline text-4xl font-extrabold tracking-tight bg-gradient-to-br from-primary via-primary/80 to-blue-600 bg-clip-text text-transparent">
            COMMAND CENTER
          </h1>
          <p className="mt-1 text-sm tracking-widest text-muted-foreground font-medium uppercase">
            NODE: {auth.venue_id?.slice(-8).toUpperCase() || 'OFFLINE'} | SECTOR: ALPHA-1
          </p>
        </div>

        <div className="flex items-center gap-4">
          {!isMonitoring ? (
            <Button 
              onClick={startMonitoring}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 flex items-center gap-2 px-6"
            >
              <Power className="w-4 h-4" />
              START SENTINEL
            </Button>
          ) : (
            <Button 
              onClick={stopMonitoring}
              variant="destructive"
              className="flex items-center gap-2 px-6"
            >
              <PowerOff className="w-4 h-4" />
              TERMINATE SESSION
            </Button>
          )}

          <Badge
            variant="outline"
            className={`${isMonitoring ? 'animate-pulse' : 'opacity-50'} border-primary/30 bg-primary/5 px-5 py-2 text-xs font-bold text-primary tracking-wider`}
          >
            <Activity className={`w-3 h-3 mr-2 ${isMonitoring ? 'text-primary' : 'text-muted-foreground'}`} />
            {isMonitoring ? "LIVE TELEMETRY" : "SYSTEM IDLE"}
          </Badge>
        </div>
      </div>

      {isMonitoring ? (
        <MonitoringGrid />
      ) : (
        <div className="flex h-[500px] items-center justify-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/5">
          <div className="text-center space-y-4">
            <div className="p-4 bg-primary/5 rounded-full inline-block">
              <Activity className="w-12 h-12 text-primary/40" />
            </div>
            <p className="text-muted-foreground tracking-widest font-medium">SYSTEM STANDBY - CLICK START TO INITIALIZE</p>
          </div>
        </div>
      )}
    </div>
  );
}
