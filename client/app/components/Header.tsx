"use client";

import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MobileNav } from "./Sidebar";
import { logout } from "../../lib/features/auth/authSlice";
import { toast } from "sonner";

export const Header = () => {
  const auth = useSelector((state: any) => state.auth);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();

  if (!auth.accessToken) return null;

  const handleLogout = () => {
    dispatch(logout());
    toast.info("Signed out — session terminated");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-border/50 bg-background/85 px-4 lg:px-6 backdrop-blur-xl shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile Navigation Trigger */}
        <MobileNav auth={auth} handleLogout={handleLogout} pathname={pathname} />

        <div className="hidden lg:flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75 duration-1000"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
          </span>
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            System Live
          </span>
        </div>

        <Separator orientation="vertical" className="hidden lg:block h-6" />

        <h3 className="headline text-sm font-semibold text-foreground hidden sm:block">
          {auth.admin?.name || "ADMINISTRATOR"}
        </h3>
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        <div className="text-right">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Hospitality Node
          </p>
          <p className="text-xs font-medium text-primary">
            {auth.venue_id?.toUpperCase() || "LOCAL_UNIT_01"}
          </p>
        </div>

        <Button variant="outline" size="icon" className="relative rounded-full border-border/50 bg-card hover:bg-accent hover:text-accent-foreground transition-all ml-2">
          <span className="text-lg">🔔</span>
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full p-0 text-[0.55rem] font-bold shadow-lg animate-bounce"
          >
            !
          </Badge>
        </Button>
      </div>
    </header>
  );
};
