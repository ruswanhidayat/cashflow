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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setRoles([]);
    await login();
  }

  async function handleRoleSelection(roleCode: string) {
    await login(roleCode);
  }

  return (
    <main>
      <h1>Login</h1>

      {roles.length === 0 ? (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="employeeId">ID Pegawai</label>

            <input
              id="employeeId"
              type="text"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
            />
          </div>

          {error && <p>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      ) : (
        <section>
          <h2>Masuk sebagai</h2>

          <p>Pilih role yang ingin digunakan.</p>

          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => handleRoleSelection(role.code)}
              disabled={loading}
            >
              {role.name}
            </button>
          ))}

          {error && <p>{error}</p>}
        </section>
      )}
    </main>
  );
}