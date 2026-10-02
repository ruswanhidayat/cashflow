import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import AppShell from "../components/app-shell";

export default async function HomePage() {
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

  if (session.role !== "USER") {
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

  const bills = await sql`
    SELECT
      b.id,
      b.amount,
      ct.code AS cash_type_code,
      ct.name AS cash_type_name
    FROM bills b
    INNER JOIN cash_types ct
      ON ct.id = b.cash_type_id
    INNER JOIN billing_periods bp
      ON bp.id = b.period_id
    WHERE b.user_id = ${user.id}
      AND bp.status = 'OPEN'
    ORDER BY ct.id
  `;

  const totalAmount = bills.reduce(
    (total, bill) => total + Number(bill.amount),
    0
  );

  const roles = (await sql`
    SELECT r.id, r.code, r.name
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ${user.id}
      AND r.is_active = TRUE
    ORDER BY r.id
  `) as Role[];

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
            "Selamat datang di Cashflow."}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            Tagihan Aktif
          </div>

          <div className="stat-value">
            {bills.length}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Total Tagihan
          </div>

          <div className="stat-value">
            Rp {totalAmount.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      <section className="content-card">
        <div className="content-card-header">
          <h2>Tagihan Aktif</h2>
        </div>

        {bills.length === 0 ? (
          <div className="empty-state">
            Tidak ada tagihan aktif.
          </div>
        ) : (
          <>
            <div className="bill-list">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="bill-item"
                >
                  <span className="bill-name">
                    {bill.cash_type_name}
                  </span>

                  <span className="bill-amount">
                    Rp{" "}
                    {Number(
                      bill.amount
                    ).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>

            <div className="total-row">
              <span>Total</span>

              <span>
                Rp{" "}
                {totalAmount.toLocaleString("id-ID")}
              </span>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}