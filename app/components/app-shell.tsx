
"use client";

import { useEffect, useState } from "react";
import Sidebar from "./sidebar";
import UserMenu from "./user-menu";

type Role = {
  id: number;
  code: string;
  name: string;
};

type AppShellProps = {
  children: React.ReactNode;
  userName: string;
  currentRole: string;
  roles: Role[];
};

export default function AppShell({
  children,
  userName,
  currentRole,
  roles,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem(
      "cashflow-sidebar-collapsed"
    );

    setCollapsed(savedState === "true");
    setSidebarReady(true);
  }, []);

  function toggleSidebar() {
    const nextValue = !collapsed;

    localStorage.setItem(
      "cashflow-sidebar-collapsed",
      String(nextValue)
    );

    setCollapsed(nextValue);
  }

  return (
    <div
      className={[
        "app-page",
        collapsed ? "sidebar-collapsed" : "",
        sidebarReady ? "sidebar-ready" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="app-header">
        <div className="app-brand">
          Buku Kas
        </div>

        <div className="app-header-right">
          <span
            className={`app-role ${
              currentRole === "BEND"
                ? "role-bend"
                : "role-user"
            }`}
          >
            {currentRole === "BEND"
              ? "Bendahara"
              : "User"}
          </span>

          <UserMenu
            userName={userName}
            currentRole={currentRole}
            roles={roles}
          />
        </div>
      </header>

      <Sidebar
        currentRole={currentRole}
        collapsed={collapsed}
        onToggleCollapsed={toggleSidebar}
      />

      <main className="app-content">
        {children}
      </main>
    </div>
  );
}
