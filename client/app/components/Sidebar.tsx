"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../lib/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Menu } from "lucide-react"; // Or default SVG if lucide is not installed
// Using standard SVGs to be safe since we don't know if lucide-react is there, 
// wait, shadcn ui uses lucide-react by default.

const navItems = [
  { name: "Command Center", path: "/dashboard", icon: "🛡️" },
  { name: "Staff Directory", path: "/management/staff", icon: "👥" },
  { name: "Guest Registry", path: "/management/guests", icon: "📋" },
  { name: "System Settings", path: "/settings", icon: "⚙️" },
];

export const NavContent = ({ auth, handleLogout, pathname }: any) => (
  <>
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
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold border-l-2 border-primary rounded-none shadow-[inset_4px_0_0_0_hsl(var(--primary))] "
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
              {isActive && (
                <Badge variant="secondary" className="ml-auto h-2 w-2 rounded-full bg-sidebar-primary shadow-[0_0_10px_hsl(var(--primary))] p-0" />
              )}
            </Button>
          </Link>
        );
      })}
    </nav>

    <Separator className="mb-4 opacity-50" />

    {/* Admin Info + Logout */}
    <div className="px-1 pb-2">
      <div className="mb-3 group cursor-default">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-sidebar-accent/50 to-sidebar-accent/10 p-4 border border-sidebar-border/20 shadow-sm transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="border border-primary/20 bg-background shadow-inner">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${auth.admin?.name || 'AD'}`} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {(auth.admin?.name || "AD").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground truncate">
                {auth.admin?.name || "ADMINISTRATOR"}
              </p>
              <p className="text-[0.65rem] text-muted-foreground truncate opacity-80">
                {auth.admin?.email || "admin@sentinel.io"}
              </p>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-[0.55rem] py-0 px-1.5 h-4 border-primary/30 text-primary-foreground font-mono bg-primary/10">
              SECURED_SESSION
            </Badge>
            <div className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
          </div>
        </div>
      </div>
      
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <span className="text-lg">🚪</span>
        <span className="text-sm font-medium">Terminate Session</span>
      </Button>
    </div>
  </>
);

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

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[280px] flex-col border-r border-sidebar-border bg-sidebar p-4 shadow-xl">
        <NavContent auth={auth} handleLogout={handleLogout} pathname={pathname} />
      </aside>

      {/* Mobile/Tablet Sheet trigger handled by Header normally, but we can also just expose it here for AppLayout if needed */}
    </>
  );
};

export const MobileNav = ({ auth, handleLogout, pathname }: any) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden text-foreground hover:bg-muted/50 rounded-full">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] flex flex-col p-4 bg-sidebar border-r-sidebar-border">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <NavContent auth={auth} handleLogout={handleLogout} pathname={pathname} />
      </SheetContent>
    </Sheet>
  );
};
