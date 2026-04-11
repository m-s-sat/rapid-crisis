"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { MonitoringGrid } from "../components/MonitoringGrid";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const auth = useSelector((state: any) => state.auth);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (!auth.isLoading && !auth.accessToken) {
      router.push("/login");
    }
  }, [auth.accessToken, auth.isLoading, router]);

  if (!mounted || auth.isLoading) {
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
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="headline text-4xl font-extrabold tracking-tight bg-gradient-to-br from-primary via-primary/80 to-blue-600 bg-clip-text text-transparent">
            COMMAND CENTER
          </h1>
          <p className="mt-1 text-sm tracking-widest text-muted-foreground font-medium">
            NODE: {mounted ? (auth.venue_id?.toUpperCase() || 'OFFLINE') : '...'} | SECTOR: ALPHA-1
          </p>
        </div>
        <Badge
          variant="outline"
          className="animate-pulse border-primary/30 bg-primary/5 px-5 py-2 text-xs font-bold text-primary tracking-wider"
        >
          <span className="relative mr-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
          LIVE TELEMETRY
        </Badge>
      </div>

      <MonitoringGrid />
    </div>
  );
}
