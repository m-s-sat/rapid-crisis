"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { StoreProvider } from "../StoreProvider";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import AuthInit from "./AuthInit";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  readonly children: ReactNode;
}

export const AppLayout = ({ children }: Props) => {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <StoreProvider>
      <AuthInit>
        {!isAuthPage && <Sidebar />}
        <div style={{ 
          marginLeft: isAuthPage ? '0' : '280px', 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          transition: 'margin 0.3s ease',
        }}>
          {!isAuthPage && <Header />}
          <main style={{ flex: 1, padding: isAuthPage ? '0' : '2rem' }}>
            {children}
          </main>
          <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999 }}>
            <ThemeToggle />
          </div>
        </div>
      </AuthInit>
    </StoreProvider>
  );
};
