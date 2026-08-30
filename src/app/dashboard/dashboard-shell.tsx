"use client";

import { useState, createContext, useContext, useEffect } from "react";
import { Sidebar } from "./sidebar";
import type { NavItem } from "./sidebar";

const SidebarContext = createContext({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);

interface DashboardShellProps {
  children: React.ReactNode;
  sidebarProps: {
    items: NavItem[];
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

  const ml = isMobile ? 0 : collapsed ? 68 : 220;

  const orgLabel =
    sidebarProps.orgType === "CLIENT"
      ? "Hospital"
      : sidebarProps.orgType === "AGENCY"
        ? "Agency"
        : "Platform";

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div className="flex min-h-screen bg-surface">
        <Sidebar {...sidebarProps} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <div
          className="flex flex-1 flex-col"
          style={{
            marginLeft: ml,
            transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Top context bar */}
          <header className="topbar">
            <div className="topbar__left">
              <span className="topbar__org-type">{orgLabel}</span>
              <span className="topbar__org-name">{sidebarProps.orgName}</span>
            </div>
            <div className="topbar__right">
              <span className="topbar__user-name">{sidebarProps.userName}</span>
              <span className="topbar__user-role">{sidebarProps.userRole}</span>
              <div className="topbar__avatar">{sidebarProps.userInitials}</div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 px-4 pt-6 pb-6 md:px-8 md:pb-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
