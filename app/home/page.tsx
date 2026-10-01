import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

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

  return (
    <main>
      <h1>Halo, {user.name}</h1>

      <p>{user.position_name}</p>

      <section>
        <h2>Tagihan Aktif</h2>

        {bills.length === 0 ? (
          <p>Tidak ada tagihan aktif.</p>
        ) : (
          <>
            {bills.map((bill) => (
              <div key={bill.id}>
                <strong>{bill.cash_type_name}</strong>
                <span>
                  Rp {Number(bill.amount).toLocaleString("id-ID")}
                </span>
              </div>
            ))}

            <hr />

            <strong>
              Total: Rp {totalAmount.toLocaleString("id-ID")}
            </strong>
          </>
        )}
      </section>
    </main>
  );
}