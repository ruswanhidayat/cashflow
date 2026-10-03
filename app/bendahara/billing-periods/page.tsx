import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import AppShell from "@/app/components/app-shell";

type Role = {
  id: number;
  code: string;
  name: string;
};

export default async function BillingPeriodsPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    redirect("/login");
  }

  let session: {
    userId: number;
    role: string;
  };

  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    redirect("/login");
  }

  if (session.role !== "BEND") {
    redirect("/login");
  }

  const users = await sql`
    SELECT
      u.id,
      u.employee_id,
      u.name,
      p.name AS position_name
    FROM users u
    LEFT JOIN positions p
      ON p.id = u.position_id
    WHERE u.id = ${session.userId}
      AND u.is_active = TRUE
    LIMIT 1
  `;

  if (users.length === 0) {
    redirect("/login");
  }

  const user = users[0];

  const roles = (await sql`
    SELECT
      r.id,
      r.code,
      r.name
    FROM user_roles ur
    INNER JOIN roles r
      ON r.id = ur.role_id
    WHERE ur.user_id = ${user.id}
      AND r.is_active = TRUE
    ORDER BY r.id
  `) as Role[];

  const periods = await sql`
    SELECT
        id,
        year,
        month,
        start_date,
        end_date,
        status
    FROM billing_periods
    ORDER BY year DESC, month ASC
    `;

  return (
    <AppShell
        userName={user.name}
        currentRole={session.role}
        roles={roles}
    >
        <div className="page-heading">
        <div>
            <h1>Billing Period</h1>
            <p>Kelola periode tagihan.</p>
        </div>

        <button className="primary-button">
            Generate Period
        </button>
        </div>

        <div className="card">
        {periods.length === 0 ? (
            <div className="empty-state">
            <h3>Belum ada billing period</h3>
            <p>
                Billing period yang sudah dibuat akan ditampilkan di sini.
            </p>
            </div>
        ) : (
            <div className="table-wrapper">
            <table className="data-table">
                <thead>
                <tr>
                    <th>Tahun</th>
                    <th>Bulan</th>
                    <th>Mulai</th>
                    <th>Selesai</th>
                    <th>Status</th>
                </tr>
                </thead>

                <tbody>
                {periods.map((period) => (
                    <tr key={period.id}>
                    <td>{period.year}</td>
                    <td>{period.month}</td>
                    <td>
                      {period.start_date.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      {period.end_date.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>{period.status}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
        </div>
    </AppShell>
    );
}