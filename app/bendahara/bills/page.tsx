
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import AppShell from "@/app/components/app-shell";

type Role = {
  id: number;
  code: string;
  name: string;
};

type BillRow = {
  user_id: number;
  name: string;
  position_name: string | null;
  period_id: number;
  year: number;
  month: number;
  cash_amount: number | string | null;
  pgb_amount: number | string | null;
};

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatAmount(amount: number | string | null) {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return Number(amount).toLocaleString("id-ID");
}

export default async function BillsPage() {
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

  if (
    session.role !== "BEND" ||
    !Number.isSafeInteger(session.userId) ||
    session.userId <= 0
  ) {
    redirect("/login");
  }

  const users = await sql`
    SELECT id, name
    FROM users
    WHERE id = ${session.userId}
      AND is_active = TRUE
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

  const bills = (await sql`
    SELECT
      u.id AS user_id,
      u.name,
      p.name AS position_name,
      bp.id AS period_id,
      bp.year,
      bp.month,
      MAX(
        CASE
          WHEN ct.code = 'KAS' THEN b.amount
        END
      ) AS cash_amount,
      MAX(
        CASE
          WHEN ct.code = 'PGB' THEN b.amount
        END
      ) AS pgb_amount
    FROM bills b
    INNER JOIN users u
      ON u.id = b.user_id
    LEFT JOIN positions p
      ON p.id = u.position_id
    INNER JOIN billing_periods bp
      ON bp.id = b.period_id
    INNER JOIN cash_types ct
      ON ct.id = b.cash_type_id
    GROUP BY
      u.id,
      u.name,
      p.name,
      bp.id,
      bp.year,
      bp.month
    ORDER BY
      bp.year DESC,
      bp.month DESC,
      u.name ASC
  `) as BillRow[];

  return (
    <AppShell
      userName={user.name}
      currentRole={session.role}
      roles={roles}
    >
      <div className="page-heading">
        <div>
          <h1>Data Tagihan</h1>
          <p>
            Lihat data tagihan pegawai berdasarkan periode
            dan jenis kas.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th rowSpan={2}>Nama</th>
                <th rowSpan={2}>Posisi</th>
                <th rowSpan={2}>Periode</th>
                <th colSpan={2} className="text-center">
                  Tagihan
                </th>
              </tr>
              <tr>
                <th className="text-right">Tagihan Kas</th>
                <th className="text-right">
                  Tagihan Paguyuban
                </th>
              </tr>
            </thead>

            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">
                    Belum ada data tagihan.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr
                    key={`${bill.user_id}-${bill.period_id}`}
                  >
                    <td>{bill.name}</td>
                    <td>{bill.position_name ?? "—"}</td>
                    <td>
                      {MONTHS[bill.month - 1] ?? "—"}{" "}
                      {bill.year}
                    </td>
                    <td className="text-right">
                      {formatAmount(bill.cash_amount)}
                    </td>
                    <td className="text-right">
                      {formatAmount(bill.pgb_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span className="table-info">
            Total {bills.length} data tagihan
          </span>
        </div>
      </div>
    </AppShell>
  );
}
