"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login gagal.");
        return;
      }

      if (data.requiresRoleSelection) {
        setError("User memiliki lebih dari satu role.");
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

  return (
    <main>
      <h1>Login</h1>

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
    </main>
  );
}