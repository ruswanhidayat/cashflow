
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";

import AppShell from "@/app/components/app-shell";
import ResponsiveSelect from "@/app/components/responsive-select";

type Role = {
  id: number;
  code: string;
  name: string;
};

type BillRow = {
  user_id: number;
  name: string;
  position_name: string | null;
  year: number;
  month: number;
  cash_1_amount: number | string | null;
  cash_2_amount: number | string | null;
};

type BillsPageProps = {
  searchParams: Promise<{
    year?: string;
    month?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 10;

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

export default async function BillsPage({
  searchParams,
}: BillsPageProps) {
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
      u.name
    FROM users u
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

  const params = await searchParams;

  const selectedYear =
    params.year && /^\d{4}$/.test(params.year)
      ? Number(params.year)
      : null;

  const selectedMonth =
    params.month &&
    /^\d+$/.test(params.month) &&
    Number(params.month) >= 1 &&
    Number(params.month) <= 12
      ? Number(params.month)
      : null;

  const requestedPage =
    params.page && /^\d+$/.test(params.page)
      ? Number(params.page)
      : 1;

  const countResult = await sql`
    SELECT COUNT(
      DISTINCT (b.user_id, b.period_id)
    ) AS total
    FROM bills b
    INNER JOIN billing_periods bp
      ON bp.id = b.period_id
    WHERE
      (
        ${selectedYear}::integer IS NULL
        OR bp.year = ${selectedYear}
      )
      AND (
        ${selectedMonth}::integer IS NULL
        OR bp.month = ${selectedMonth}
      )
  `;

  const totalItems = Number(countResult[0].total);

  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / PAGE_SIZE)
  );

  const currentPage = Math.min(
    Math.max(requestedPage, 1),
    totalPages
  );

  const offset = (currentPage - 1) * PAGE_SIZE;

  const bills = (await sql`
    SELECT
      u.id AS user_id,
      u.name,
      p.name AS position_name,
      bp.year,
      bp.month,
      MAX(
        CASE
            WHEN ct.code = 'KAS'
            THEN b.amount
        END
        ) AS cash_amount,
      MAX(
        CASE
            WHEN ct.code = 'PGB'
            THEN b.amount
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
    WHERE
      (
        ${selectedYear}::integer IS NULL
        OR bp.year = ${selectedYear}
      )
      AND (
        ${selectedMonth}::integer IS NULL
        OR bp.month = ${selectedMonth}
      )
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
    LIMIT ${PAGE_SIZE}
    OFFSET ${offset}
  `) as BillRow[];

  const years = await sql`
    SELECT DISTINCT bp.year
    FROM bills b
    INNER JOIN billing_periods bp
      ON bp.id = b.period_id
    ORDER BY bp.year DESC
  `;

  function buildPageUrl(page: number) {
    const query = new URLSearchParams();

    if (selectedYear) {
      query.set("year", String(selectedYear));
    }

    if (selectedMonth) {
      query.set("month", String(selectedMonth));
    }

    query.set("page", String(page));

    return `?${query.toString()}`;
  }

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
        <form method="GET" className="table-filter">
          <div className="filter-group">
            <label htmlFor="year">Tahun</label>

            <ResponsiveSelect
              id="year"
              name="year"
              value={String(selectedYear ?? "")}
              options={[
                {
                  value: "",
                  label: "Semua tahun",
                },
                ...years.map((item) => ({
                  value: String(item.year),
                  label: String(item.year),
                })),
              ]}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="month">Bulan</label>

            <ResponsiveSelect
              id="month"
              name="month"
              value={String(selectedMonth ?? "")}
              options={[
                {
                  value: "",
                  label: "Semua bulan",
                },
                ...MONTHS.map((month, index) => ({
                  value: String(index + 1),
                  label: month,
                })),
              ]}
            />
          </div>

          <div className="filter-actions">
            <button
              type="submit"
              className="filter-button"
            >
              Filter
            </button>

            <a
              href="/bendahara/bills"
              className="reset-filter-button"
            >
              Reset
            </a>
          </div>
        </form>

        {bills.length === 0 ? (
          <div className="empty-state">
            <h3>
              {totalItems === 0
                ? "Belum ada data tagihan"
                : "Tidak ada data"}
            </h3>

            <p>
              {totalItems === 0
                ? "Tagihan yang sudah dibuat akan ditampilkan di sini."
                : "Tidak ada tagihan yang sesuai dengan filter."}
            </p>
          </div>
        ) : (
          <>
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
                    <th className="text-right">Kas 1</th>
                    <th className="text-right">Kas 2</th>
                  </tr>
                </thead>

                <tbody>
                  {bills.map((bill, index) => (
                    <tr
                      key={`${bill.user_id}-${bill.year}-${bill.month}-${index}`}
                    >
                      <td>{bill.name}</td>
                      <td>{bill.position_name ?? "—"}</td>
                      <td>
                        {MONTHS[bill.month - 1]} {bill.year}
                      </td>
                      <td className="text-right">
                        {formatAmount(bill.cash_1_amount)}
                      </td>
                      <td className="text-right">
                        {formatAmount(bill.cash_2_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span className="table-info">
                Menampilkan {offset + 1}–
                {Math.min(offset + PAGE_SIZE, totalItems)}{" "}
                dari {totalItems} data
              </span>

              {totalPages > 1 && (
                <div className="pagination">
                  {currentPage > 1 ? (
                    <a
                      href={buildPageUrl(currentPage - 1)}
                      className="pagination-button"
                    >
                      Sebelumnya
                    </a>
                  ) : (
                    <span className="pagination-button disabled">
                      Sebelumnya
                    </span>
                  )}

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((page) =>
                    page === currentPage ? (
                      <span
                        key={page}
                        className="pagination-button active"
                      >
                        {page}
                      </span>
                    ) : (
                      <a
                        key={page}
                        href={buildPageUrl(page)}
                        className="pagination-button"
                      >
                        {page}
                      </a>
                    )
                  )}

                  {currentPage < totalPages ? (
                    <a
                      href={buildPageUrl(currentPage + 1)}
                      className="pagination-button"
                    >
                      Berikutnya
                    </a>
                  ) : (
                    <span className="pagination-button disabled">
                      Berikutnya
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
