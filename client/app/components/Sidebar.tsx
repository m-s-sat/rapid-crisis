"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../lib/features/auth/authSlice";

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((state: any) => state.auth);

  if (!auth.accessToken) return null;

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  const navItems = [
    { name: "Command Center", path: "/dashboard", icon: "🛡️" },
    { name: "Staff Directory", path: "/management/staff", icon: "👥" },
    { name: "Guest Registry", path: "/management/guests", icon: "📋" },
    { name: "System Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <aside style={{ width: '280px', height: '100vh', background: 'var(--surface-low)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', padding: '2rem 1rem', position: 'fixed' }}>
      <div style={{ marginBottom: '3rem', padding: '0 1rem' }}>
        <h2 className="headline" style={{ color: 'var(--primary)', fontSize: '1.2rem', letterSpacing: '0.1em' }}>SENTINEL</h2>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '0.2rem' }}>Crisis Response v1.0</p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={isActive ? "glass" : ""}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '12px 16px', 
                borderRadius: '8px',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.9rem' }}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '1rem', marginTop: 'auto' }}>
        <button 
          onClick={handleLogout}
          className="btn-ghost" 
          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
