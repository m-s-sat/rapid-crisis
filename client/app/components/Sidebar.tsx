"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../lib/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((state: any) => state.auth);

  if (!auth.accessToken) return null;

  const handleLogout = () => {
    dispatch(logout());
    toast.info("Signed out — session terminated");
    router.push("/login");
  };

  const navItems = [
    { name: "Command Center", path: "/dashboard", icon: "🛡️" },
    { name: "Staff Directory", path: "/management/staff", icon: "👥" },
    { name: "Guest Registry", path: "/management/guests", icon: "📋" },
    { name: "System Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-sidebar-border bg-sidebar p-4">
      {/* Logo */}
      <div className="mb-8 px-3 pt-4">
        <h2 className="headline text-lg font-bold tracking-widest text-sidebar-primary">
          SENTINEL
        </h2>
        <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Crisis Response v1.0
        </p>
      </div>

      <Separator className="mb-4 opacity-50" />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className="no-underline">
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 px-3 py-5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
                {isActive && (
                  <Badge variant="secondary" className="ml-auto h-2 w-2 rounded-full bg-sidebar-primary p-0" />
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      <Separator className="mb-4 opacity-50" />

      {/* Admin Info + Logout */}
      <div className="px-1 pb-2">
        <div className="mb-3 rounded-lg bg-sidebar-accent/30 p-3">
          <p className="text-xs font-semibold text-sidebar-foreground">
            {auth.admin?.name || "ADMINISTRATOR"}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-muted-foreground truncate">
            {auth.admin?.email || "admin@sentinel.io"}
          </p>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};
