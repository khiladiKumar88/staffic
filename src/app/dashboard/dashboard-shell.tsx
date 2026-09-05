"use client";

import { useState, createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import type { NavItem } from "./sidebar";

const SidebarContext = createContext({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);

/** Map pathnames to breadcrumb page labels */
function getPageLabel(pathname: string): string {
  const segments = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const labels: Record<string, string> = {
    requisitions: "Requisitions",
    submissions: "Submissions",
    timesheets: "Timesheets",
    invoices: "Invoices",
    marketplace: "Marketplace",
    candidates: "Candidates",
    "float-pool": "Float Pool",
    "direct-hire": "Direct Hire",
    reports: "Reports",
    team: "Team",
    settings: "Settings",
    admin: "Admin",
  };
  return labels[segments[0]] ?? segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
}

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
  const pathname = usePathname();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const ml = isMobile ? 0 : collapsed ? 68 : 220;
  const pageLabel = getPageLabel(pathname);

  const roleLabel =
    sidebarProps.orgType === "CLIENT"
      ? "Hospital admin"
      : sidebarProps.orgType === "AGENCY"
        ? "Agency"
        : "Platform admin";

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
          {/* Top bar */}
          <header className="topbar">
            <div className="topbar__left">
              <span className="topbar__breadcrumb-org">{sidebarProps.orgName}</span>
              <span className="topbar__breadcrumb-sep">/</span>
              <span className="topbar__breadcrumb-page">{pageLabel}</span>
            </div>

            <div className="topbar__center">
              <div className="topbar__search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" placeholder="Search reqs, candidates, invoices..." readOnly />
              </div>
            </div>

            <div className="topbar__right">
              <span className="topbar__role-select">{roleLabel}</span>

              {/* Notification bell */}
              <button type="button" className="topbar__notification-btn" aria-label="Notifications">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {sidebarProps.pendingCount > 0 && <span className="topbar__notification-dot" />}
              </button>

              <UserMenu
                name={sidebarProps.userName}
                role={sidebarProps.userRole}
                initials={sidebarProps.userInitials}
              />
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 px-4 pt-5 pb-6 md:px-6 md:pb-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
