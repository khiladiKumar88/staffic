"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

/* ------------------------------------------------------------------ */
/*  Icon map — one SVG per nav label                                  */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ReactNode> = {
  Overview: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Requisitions: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  Marketplace: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  Candidates: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  "My Submissions": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4z" />
    </svg>
  ),
  "Float Pool": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  "Direct Hire": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Timesheets: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Invoices: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Reports: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Team: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  "Pending Agencies": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
};

function getIcon(label: string) {
  return ICON_MAP[label] ?? ICON_MAP["Overview"];
}

const SECTION_BEFORE: Record<string, string> = {
  Timesheets: "Finance",
  Reports: "Insights",
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  items: { href: string; label: string }[];
  orgName: string;
  orgType: "CLIENT" | "AGENCY" | "PLATFORM";
  userName: string;
  userRole: string;
  userInitials: string;
  pendingCount: number;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  items,
  orgName,
  orgType,
  userName,
  userRole,
  userInitials,
  pendingCount,
  collapsed,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Determine which badge to show on which nav item
  function showBadge(label: string) {
    if (pendingCount === 0) return false;
    if (orgType === "AGENCY" && label === "My Submissions") return true;
    if (orgType === "CLIENT" && label === "Requisitions") return true;
    if (orgType === "PLATFORM" && label === "Pending Agencies") return true;
    return false;
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="sidebar__brand">
        <Link href="/dashboard" className="sidebar__logo-link">
          <div className="sidebar__logo-mark">S</div>
          {!collapsed && <span className="sidebar__logo-text">Staffic</span>}
        </Link>
        {/* Desktop: collapse toggle. Mobile: hidden (uses X button instead) */}
        <button
          type="button"
          onClick={onToggle}
          className="sidebar__collapse-btn sidebar__collapse-btn--desktop"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: collapsed ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {/* Mobile: close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="sidebar__collapse-btn sidebar__collapse-btn--mobile"
          aria-label="Close menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Org badge */}
      {!collapsed && (
        <div className="sidebar__org-badge">
          <div className="sidebar__org-dot" />
          <span className="sidebar__org-name">{orgName}</span>
          <span className="sidebar__org-type">
            {orgType === "CLIENT" ? "Hospital" : orgType === "AGENCY" ? "Agency" : "Platform"}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar__nav">
        {items.map((item) => {
          const section = SECTION_BEFORE[item.label];
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <div key={item.href}>
              {section && !collapsed && (
                <div className="sidebar__section-label">{section}</div>
              )}
              <Link
                href={item.href}
                className={`sidebar__nav-item ${isActive ? "sidebar__nav-item--active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar__nav-icon">{getIcon(item.label)}</span>
                {!collapsed && <span className="sidebar__nav-label">{item.label}</span>}
                {!collapsed && showBadge(item.label) && (
                  <span className="sidebar__badge">{pendingCount}</span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User menu */}
      <div ref={userMenuRef} className="sidebar__user-area">
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="sidebar__user-btn"
        >
          <div className="sidebar__avatar">{userInitials}</div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{userName}</span>
              <span className="sidebar__user-role">{userRole}</span>
            </div>
          )}
          {!collapsed && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="sidebar__chevron"
              style={{ transform: userMenuOpen ? "rotate(180deg)" : undefined }}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {userMenuOpen && (
          <div className="sidebar__dropdown">
            <div className="sidebar__dropdown-header">
              <span className="sidebar__dropdown-name">{userName}</span>
              <span className="sidebar__dropdown-role">{userRole}</span>
            </div>
            <div className="sidebar__dropdown-divider" />
            <button
              type="button"
              onClick={() => signOut({ redirectTo: "/login" })}
              className="sidebar__dropdown-item"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger — visible only on small screens */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="sidebar-mobile-toggle"
        aria-label="Open menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={`sidebar sidebar--desktop ${collapsed ? "sidebar--collapsed" : ""}`}
        style={{ width: collapsed ? 68 : 240 }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (overlay) */}
      <aside
        className={`sidebar sidebar--mobile ${mobileOpen ? "sidebar--mobile-open" : ""}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
