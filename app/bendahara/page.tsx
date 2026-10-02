import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import AppShell from "../components/app-shell";

export default async function BendaharaPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    redirect("/login");
  }

  let session: {
    userId: number;
    role: string;
  };

  type Role = {
    id: number;
    code: string;
    name: string;
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

  const periods = await sql`
    SELECT
      id,
      year,
      month,
      start_date,
      end_date,
      status
    FROM billing_periods
    ORDER BY year DESC, month DESC
    LIMIT 5
  `;

  const activePeriod = periods.find(
    (period) => period.status === "OPEN"
  );

  const bills = activePeriod
    ? await sql`
        SELECT
          id,
          amount
        FROM bills
        WHERE period_id = ${activePeriod.id}
      `
    : [];

  const roles = (await sql`
    SELECT r.id, r.code, r.name
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ${user.id}
      AND r.is_active = TRUE
    ORDER BY r.id
  `) as Role[];

  const totalBills = bills.reduce(
    (total, bill) => total + Number(bill.amount),
    0
  );

  return (
    <AppShell
      userName={user.name}
      currentRole={session.role}
      roles={roles}
    >
      <div className="page-heading">
        <h1>Halo, {user.name}</h1>

        <p>
          {user.position_name ||
            "Dashboard Bendahara"}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            Periode Aktif
          </div>

          <div className="stat-value">
            {activePeriod
              ? `${activePeriod.year}/${activePeriod.month}`
              : "-"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Total Tagihan
          </div>

          <div className="stat-value">
            Rp {totalBills.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      <section className="content-card">
        <div className="content-card-header">
          <h2>Billing Period</h2>
        </div>

        {activePeriod ? (
          <>
            <div className="bill-item">
              <div>
                <div className="bill-name">
                  {activePeriod.year}/
                  {activePeriod.month}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color: "var(--text-secondary)",
                    fontSize: 13,
                  }}
                >
                  {String(activePeriod.start_date)}
                  {" - "}
                  {String(activePeriod.end_date)}
                </div>
              </div>

              <span className="app-role">
                {activePeriod.status}
              </span>
            </div>
          </>
        ) : (
          <div className="empty-state">
            Belum ada periode aktif.
          </div>
        )}
      </section>

      <section
        className="content-card"
        style={{ marginTop: 16 }}
      >
        <div className="content-card-header">
          <h2>Tagihan</h2>
        </div>

        <div className="empty-state">
          {bills.length === 0
            ? "Belum ada tagihan pada periode aktif."
            : `${bills.length} tagihan dengan total Rp ${totalBills.toLocaleString(
                "id-ID"
              )}.`}
        </div>
      </section>
    </AppShell>
  );
}