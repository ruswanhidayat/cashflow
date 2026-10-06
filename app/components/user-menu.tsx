"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Role = {
  id: number;
  code: string;
  name: string;
};

type UserMenuProps = {
  userName: string;
  currentRole: string;
  roles: Role[];
};

export default function UserMenu({
  userName,
  currentRole,
  roles,
}: UserMenuProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    window.addEventListener(
      "scroll",
      handleScroll,
      true
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true
      );
    };
  }, [open]);

  async function handleLogout() {
    setLoading(true);

    try {
      await fetch("/api/logout", {
        method: "POST",
      });

      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchRole(roleCode: string) {
    if (roleCode === currentRole) {
      setOpen(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/switch-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Gagal berpindah role.");
        return;
      }

      if (data.role === "USER") {
        router.push("/home");
      } else if (data.role === "BEND") {
        router.push("/bendahara");
      }

      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  const currentRoleData = roles.find(
    (role) => role.code === currentRole
  );

  return (
    <div
      className="user-menu-wrapper"
      ref={menuRef}
    >
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        disabled={loading}
      >
        <span className="user-menu-desktop-name">
          {userName}
        </span>

        <span className="user-menu-mobile-avatar">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="user-menu">
          <div className="user-menu-info">
            <p className="user-menu-name">{userName}</p>

            <p className="user-menu-role">
              {currentRoleData?.name || currentRole}
            </p>
          </div>

          {roles.length > 1 && (
            <>
              {roles
                .filter(
                  (role) => role.code !== currentRole
                )
                .map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className="user-menu-button"
                    onClick={() =>
                      handleSwitchRole(role.code)
                    }
                    disabled={loading}
                  >
                    Beralih ke {role.name}
                  </button>
                ))}
            </>
          )}

          <button
            type="button"
            className="user-menu-button danger"
            onClick={handleLogout}
            disabled={loading}
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}