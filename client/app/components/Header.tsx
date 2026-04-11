"use client";

import { useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Header = () => {
  const auth = useSelector((state: any) => state.auth);

  if (!auth.accessToken) return null;

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            System Live
          </span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <h3 className="headline text-sm font-semibold text-foreground">
          {auth.admin?.name || "ADMINISTRATOR"}
        </h3>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Hospitality Node
          </p>
          <p className="text-xs font-medium text-primary">
            {auth.venue_id || "LOCAL_UNIT_01"}
          </p>
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <span className="text-xl">🔔</span>
          <Badge
            variant="destructive"
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[0.55rem]"
          >
            !
          </Badge>
        </Button>
      </div>
    </header>
  );
};
