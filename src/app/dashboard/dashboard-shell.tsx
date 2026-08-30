"use client";

import { useState, createContext, useContext, useEffect } from "react";
import { Sidebar } from "./sidebar";

const SidebarContext = createContext({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);

interface DashboardShellProps {
  children: React.ReactNode;
  sidebarProps: {
    items: { href: string; label: string }[];
    orgName: string;
    orgType: "CLIENT" | "AGENCY" | "PLATFORM";
    userName: string;
    userRole: string;
    userInitials: string;
    pendingCount: number;
  };
}

export function DashboardShell({ children, sidebarProps }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // On mobile, no margin — sidebar is an overlay. On desktop, margin matches sidebar width.
  const ml = isMobile ? 0 : collapsed ? 68 : 240;

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div className="flex min-h-screen bg-surface">
        <Sidebar {...sidebarProps} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <main
          className="flex-1 px-4 pt-16 pb-6 md:px-8 md:pt-8 md:pb-8"
          style={{
            marginLeft: ml,
            transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
