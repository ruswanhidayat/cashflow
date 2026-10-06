"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SidebarProps = {
  currentRole: string;
};

export default function Sidebar({
  currentRole,
}: SidebarProps) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem(
      "cashflow-sidebar-collapsed"
    );

    if (savedState === "true") {
      setCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((value) => {
      const nextValue = !value;

      localStorage.setItem(
        "cashflow-sidebar-collapsed",
        String(nextValue)
      );

      return nextValue;
    });
  }

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  function isActive(path: string) {
    return pathname === path;
  }

  if (currentRole !== "BEND") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="mobile-sidebar-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Buka menu"
      >
        <span />
        <span />
        <span />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="mobile-sidebar-overlay"
          onClick={closeMobileSidebar}
          aria-label="Tutup menu"
        />
      )}

      <aside
        className={[
          "app-sidebar",
          collapsed ? "collapsed" : "",
          mobileOpen ? "mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="sidebar-top">
          <div className="sidebar-section-title">
            Menu
          </div>

          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={toggleSidebar}
            aria-label={
              collapsed
                ? "Perbesar sidebar"
                : "Perkecil sidebar"
            }
            title={
              collapsed
                ? "Perbesar sidebar"
                : "Perkecil sidebar"
            }
          >
            <span>
              {collapsed ? "›" : "‹"}
            </span>
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link
            href="/bendahara"
            className={`sidebar-link ${
              isActive("/bendahara")
                ? "active"
                : ""
            }`}
            onClick={closeMobileSidebar}
            title={
              collapsed
                ? "Dashboard"
                : undefined
            }
          >
            <span className="sidebar-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />
              </svg>
            </span>

            <span className="sidebar-label">
              Dashboard
            </span>
          </Link>

          <div className="sidebar-group">
            <div className="sidebar-group-title">
              Administrasi
            </div>

            <Link
              href="/bendahara/billing-periods"
              className={`sidebar-link ${
                isActive(
                  "/bendahara/billing-periods"
                )
                  ? "active"
                  : ""
              }`}
              onClick={closeMobileSidebar}
              title={
                collapsed
                  ? "Billing Period"
                  : undefined
              }
            >
              <span className="sidebar-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 17H5V9h14v10ZM7 11h3v3H7v-3Zm5 0h3v3h-3v-3Zm5 0h1v3h-1v-3Z" />
                </svg>
              </span>

              <span className="sidebar-label">
                Billing Period
              </span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}