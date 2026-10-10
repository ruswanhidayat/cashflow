"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Role = {
  id: number;
  code: string;
  name: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(roleCode?: string) {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          roleCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login gagal.");
        return;
      }

      if (data.requiresRoleSelection) {
        setRoles(data.roles);
        setShowRoleModal(true);
        return;
      }

      if (data.role === "USER") {
        router.push("/home");
        return;
      }

      if (data.role === "BEND") {
        router.push("/bendahara");
        return;
      }

      setError("Role user tidak dikenali.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setRoles([]);
    setShowRoleModal(false);

    await login();
  }

  async function handleRoleSelection(roleCode: string) {
    await login(roleCode);
  }

  return (
    <main className="gradient-untitled">
      <section className="login-card">
        <div className="login-brand">
          <h1>Buku Kas</h1>

          <p>
            Pencatatan Kas Seksi PSPP II.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="employeeId">
              ID Pegawai
            </label>

            <input
              id="employeeId"
              className="form-input"
              type="text"
              value={employeeId}
              onChange={(event) =>
                setEmployeeId(event.target.value)
              }
              placeholder="Masukkan ID Pegawai"
              autoComplete="off"
              required
            />
          </div>

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </section>

      {showRoleModal && (
        <div className="modal-overlay">
          <section className="modal-card">
            <h2>Masuk sebagai</h2>

            <p>
              Akun ini memiliki lebih dari satu role.
              Pilih role yang ingin digunakan.
            </p>

            <div className="role-list">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className="role-button"
                  onClick={() =>
                    handleRoleSelection(role.code)
                  }
                  disabled={loading}
                >
                  {role.name}
                </button>
              ))}
            </div>

            {error && (
              <p
                className="error-message"
                style={{ marginTop: 16, marginBottom: 0 }}
              >
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}