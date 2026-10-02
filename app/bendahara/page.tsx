import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

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

  return (
    <main>
      <h1>Halo, {user.name}</h1>

      <p>{user.position_name}</p>

      <section>
        <h2>Billing Period Test</h2>

        <p>
          Jumlah periode: {periods.length}
        </p>

        <p>
          Periode aktif:{" "}
          {activePeriod
            ? `${activePeriod.year}/${activePeriod.month}`
            : "Tidak ada"}
        </p>

        {activePeriod && (
          <p>
            Periode:
            {" "}
            {String(activePeriod.start_date)}
            {" - "}
            {String(activePeriod.end_date)}
          </p>
        )}

        {periods.map((period) => (
          <p key={period.id}>
            {period.id} - {period.year} - {period.month} - {period.status}
          </p>
        ))}
      </section>

      <section>
        <h2>Bill Test</h2>

        <p>Jumlah bill: {bills.length}</p>

        {bills.map((bill) => (
          <p key={bill.id}>
            {bill.id} - Rp {Number(bill.amount).toLocaleString("id-ID")}
          </p>
        ))}
      </section>

      <p>User ID: {user.id}</p>
      <p>Role: {session.role}</p>
    </main>
  );
}