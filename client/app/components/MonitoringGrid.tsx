"use client";

import { useMonitorContext } from "../context/MonitorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const MonitoringGrid = () => {
  const { sensorData, activeCrisis, messages, handleAdminDecision, isPaused, pauseTimeRemaining } = useMonitorContext();
  const [, setTick] = useState(0);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Force re-render every second to update 'Pending' and 'Freshness' counters
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const sensors = sensorData?.sensors;
  const sensorStats = [
    { label: "Temperature", value: sensors?.temperature_c !== undefined ? `${sensors.temperature_c.toFixed(1)}°C` : "--", color: "text-blue-400" },
    { label: "Humidity", value: sensors?.humidity_pct !== undefined ? `${sensors.humidity_pct.toFixed(1)}%` : "--", color: "text-indigo-400" },
    { label: "Smoke Level", value: sensors?.smoke_ppm !== undefined ? `${sensors.smoke_ppm.toFixed(0)} ppm` : "--", color: "text-red-400" },
    { label: "Air Quality", value: sensors?.air_quality_index !== undefined ? `${sensors.air_quality_index.toFixed(0)}` : "--", color: "text-purple-400" },
    { label: "CO2 Level", value: sensors?.co2_ppm !== undefined ? `${sensors.co2_ppm.toFixed(0)} ppm` : "--", color: "text-orange-400" },
    { label: "CO Level", value: sensors?.co_ppm !== undefined ? `${sensors.co_ppm.toFixed(1)} ppm` : "--", color: "text-rose-500" },
    { label: "Gas LPG", value: sensors?.gas_lpg_ppm !== undefined ? `${sensors.gas_lpg_ppm.toFixed(1)} ppm` : "--", color: "text-orange-600" },
    { label: "Gas Methane", value: sensors?.gas_methane_ppm !== undefined ? `${sensors.gas_methane_ppm.toFixed(1)} ppm` : "--", color: "text-amber-500" },
    { label: "Sound Level", value: sensors?.sound_db !== undefined ? `${sensors.sound_db.toFixed(1)} dB` : "--", color: "text-teal-400" },
    { label: "Vibration", value: sensors?.vibration_g !== undefined ? `${sensors.vibration_g.toFixed(2)} g` : "--", color: "text-yellow-500" },
    { label: "Water Level", value: sensors?.water_level_cm !== undefined ? `${sensors.water_level_cm.toFixed(1)} cm` : "--", color: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-[1fr_300px] gap-6 min-h-[600px]">
      {/* Main Content */}
      <div className="flex flex-col gap-6">

        {/* Pause Banner */}
        {isPaused && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500"></span>
                </span>
                <div>
                  <AlertTitle className="text-orange-500 font-bold text-sm">TELEMETRY PAUSED</AlertTitle>
                  <AlertDescription className="text-muted-foreground text-xs">
                    Crisis response active — sensor stream on hold
                  </AlertDescription>
                </div>
              </div>
              <div className="rounded-lg bg-orange-500/20 px-4 py-2 font-mono text-xl font-extrabold text-orange-500 tracking-wider">
                {formatCountdown(pauseTimeRemaining)}
              </div>
            </div>
          </Alert>
        )}
        

        {/* Sensor Grid */}
        <div className={`grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 transition-opacity duration-300 ${isPaused ? 'opacity-50' : ''}`}>
          {sensorStats.map((stat, i) => (
            <Card 
              key={i} 
              className="bg-card/60 backdrop-blur-md border-border/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-primary/10 hover:border-primary/40 hover:bg-card/80 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationFillMode: "both", animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color} drop-shadow-md`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Crisis Alert Panel */}
        {activeCrisis && (
          <Card className="border-destructive/50 bg-destructive/5 animate-pulse">
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive text-xl font-extrabold flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                </span>
                CRISIS DETECTED: {activeCrisis.crisis_type || (activeCrisis.crisis_details ? activeCrisis.crisis_details.type : "Unknown")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">
                Zone: <span className="font-semibold">{activeCrisis.zone || (activeCrisis.zones ? activeCrisis.zones[0] : "unknown")}</span>
                {" | "}
                Confidence: <Badge variant="destructive" className="ml-2">{(activeCrisis.confidence_score * 100).toFixed(0)}%</Badge>
              </p>

              <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg bg-background/40 p-3 border border-destructive/20">
                <div>
                  <p className="text-[0.6rem] uppercase text-muted-foreground font-bold mb-1">DATA FRESHNESS</p>
                  <p className="text-sm font-mono text-destructive">
                    {activeCrisis.source_timestamp ? `${Math.floor((Date.now() - new Date(activeCrisis.source_timestamp).getTime()) / 1000)}s ago` : 'Real-time'}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase text-muted-foreground font-bold mb-1">ANALYSIS TIME</p>
                  <p className="text-sm font-mono text-blue-400">
                    {activeCrisis.analysis_duration ? `${activeCrisis.analysis_duration}s` : '--'}
                  </p>
                </div>
              </div>

              {/* AI Reasoning Section */}
              <div className="mb-4 rounded-lg bg-blue-500/10 p-4 border border-blue-500/20">
                <p className="text-[0.6rem] uppercase text-blue-400 font-bold mb-2 tracking-widest">SENTINEL AI ANALYSIS</p>
                <p className="text-sm font-bold text-foreground mb-1">"{activeCrisis.summary}"</p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">{activeCrisis.reasoning}</p>
              </div>

              {/* Evidence Snapshot */}
              {activeCrisis.trigger_sensors && (
                <div className="mb-6">
                  <p className="text-[0.6rem] uppercase text-muted-foreground font-bold mb-2 tracking-widest">EVIDENCE SNAPSHOT (AT TRIGGER)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(activeCrisis.trigger_sensors).map(([key, value]: [string, any]) => {
                      // Filter out known constant or non-metric sensors for cleaner UI
                      if (['device_id', 'zone'].includes(key)) return null;
                      if (typeof value !== 'number' && typeof value !== 'boolean') return null;
                      
                      return (
                        <div key={key} className="rounded bg-muted/30 p-2 border border-border/20">
                          <p className="text-[0.55rem] uppercase text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">{key.replace(/_/g, ' ')}</p>
                          <p className="text-[0.65rem] font-mono font-bold">
                            {typeof value === 'number' ? value.toFixed(1) : (value ? 'YES' : 'NO')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {activeCrisis.confidence_score < 0.7 && (
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="font-bold min-w-[200px]"
                    disabled={isProcessingAction}
                    onClick={async () => {
                      setIsProcessingAction(true);
                      try {
                        await handleAdminDecision('approve', activeCrisis);
                      } finally {
                        setIsProcessingAction(false);
                      }
                    }}
                  >
                    {isProcessingAction ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : '🚨'} ACTIVATE PROTOCOL
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleAdminDecision('cancel', activeCrisis)}
                  >
                    FALSE ALARM
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Hub */}
        <Card className="flex-1 bg-card/60 backdrop-blur-sm border-border/30 min-h-[300px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide">SYSTEM ACTIVITY HUB</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] overflow-y-auto flex flex-col gap-3 pr-2 scrollbar-thin">
            {messages.length === 0 ? (
              <p className="text-muted-foreground italic text-sm">
                Monitoring protocols active. Awaiting telemetry data...
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg bg-muted/30 p-3 border-l-4 ${
                    msg.type === 'alert' ? 'border-l-destructive' :
                    msg.type === 'success' ? 'border-l-green-500' :
                    'border-l-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[0.65rem] text-muted-foreground">{msg.time}</span>
                    {msg.confidence && (
                      <Badge variant="destructive" className="text-[0.6rem] h-5">
                        {Math.round(msg.confidence * 100)}% Match
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{msg.text}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="flex flex-col gap-4">
        <Card className="bg-card/60 backdrop-blur-sm border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">NODE STATUS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isPaused ? 'bg-orange-400' : 'bg-green-400'}`}></span>
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isPaused ? 'bg-orange-500' : 'bg-green-500'}`}></span>
              </span>
              <span className={`text-sm ${isPaused ? 'text-orange-500' : 'text-green-500'}`}>
                {isPaused ? 'Telemetry Paused' : 'IoT Sensor Node Online'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              </span>
              <span className="text-sm text-blue-400">Gateway Linked</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">PROTOCOL 7</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sentinel Command is currently operating in Automated Response mode. Confidence scores above 70% will trigger immediate guest notification.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
