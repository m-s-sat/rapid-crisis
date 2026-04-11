"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { StoreProvider } from "../StoreProvider";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import AuthInit from "./AuthInit";
import { ThemeToggle } from "./ThemeToggle";
import { MonitorProvider } from "../context/MonitorContext";

interface Props {
  readonly children: ReactNode;
}

export const AppLayout = ({ children }: Props) => {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <StoreProvider>
      <AuthInit>
        <MonitorProvider>
          {!isAuthPage && <Sidebar />}
          <div
            className="flex min-h-screen flex-col transition-all duration-300"
            style={{ marginLeft: isAuthPage ? '0' : '280px' }}
          >
            {!isAuthPage && <Header />}
            <main className={`flex-1 ${isAuthPage ? "p-0" : "p-6"}`}>
              {children}
            </main>
            <div className="fixed bottom-6 right-6 z-[9999]">
              <ThemeToggle />
            </div>
          </div>
        </MonitorProvider>
      </AuthInit>
    </StoreProvider>
  );
};
