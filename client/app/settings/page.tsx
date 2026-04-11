"use client";

import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings() {
  const auth = useSelector((state: any) => state.auth);

  return (
    <div className="mx-auto max-w-[800px]">
      <div className="mb-8">
        <h1 className="headline text-2xl font-extrabold text-primary">SYSTEM SETTINGS</h1>
        <p className="text-sm text-muted-foreground">Configure administrative and node-level parameters</p>
      </div>

      {/* Admin Profile */}
      <Card className="mb-6 border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide">ADMINISTRATIVE PROFILE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">ADMIN NAME</p>
              <p className="text-base font-medium">{auth.admin?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">EMAIL ADDRESS</p>
              <p className="text-base font-medium">{auth.admin?.email || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Venue Config */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide">VENUE CONFIGURATION</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">VENUE ID</p>
              <p className="text-base font-medium text-primary">{auth.venue_id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">NODE STATUS</p>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 font-bold">
                ONLINE / ENCRYPTED
              </Badge>
            </div>
          </div>

          <Separator className="opacity-30" />

          <Alert className="bg-muted/30 border-border/30">
            <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
              🔐 Security tokens are rotated automatically every 15 minutes. Session persistence is managed via secure 7-day refresh cycles.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
