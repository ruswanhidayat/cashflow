import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";

import AppShell from "@/app/components/app-shell";
import GeneratePeriodButton from "./generate-period-button";
import GenerateBillsButton from "./generate-bills-button";

type Role = {
  id: number;
  code: string;
  name: string;
};

type BillingPeriod = {
  id: number;
  year: number;
  month: number;
  start_date: Date;
  end_date: Date;
  status: string;
  bill_generation_status: string;
};

type BillingPeriodsPageProps = {
  searchParams: Promise<{
    year?: string;
    month?: string;
    status?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 10;

export default async function BillingPeriodsPage({
  searchParams,
}: BillingPeriodsPageProps) {
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

  const selectedStatus =
    params.status === "DRAFT" ||
    params.status === "OPEN" ||
    params.status === "CLOSED"
      ? params.status
      : null;

  const requestedPage =
    params.page && /^\d+$/.test(params.page)
      ? Number(params.page)
      : 1;

  const countResult = await sql`
    SELECT COUNT(*) AS total
    FROM billing_periods
    WHERE
      (${selectedYear}::integer IS NULL OR year = ${selectedYear})
      AND (
        ${selectedMonth}::integer IS NULL
        OR month = ${selectedMonth}
      )
      AND (
        ${selectedStatus}::varchar IS NULL
        OR status = ${selectedStatus}
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

  const periods = (await sql`
    SELECT
      id,
      year,
      month,
      start_date,
      end_date,
      status,
      bill_generation_status
    FROM billing_periods
    WHERE
      (${selectedYear}::integer IS NULL OR year = ${selectedYear})
      AND (
        ${selectedMonth}::integer IS NULL
        OR month = ${selectedMonth}
      )
      AND (
        ${selectedStatus}::varchar IS NULL
        OR status = ${selectedStatus}
      )
    ORDER BY year DESC, month ASC
    LIMIT ${PAGE_SIZE}
    OFFSET ${offset}
  `) as BillingPeriod[];

  const years = await sql`
    SELECT DISTINCT year
    FROM billing_periods
    ORDER BY year DESC
  `;

  function buildPageUrl(page: number) {
    const query = new URLSearchParams();

    if (selectedYear) {
      query.set("year", String(selectedYear));
    }

    if (selectedMonth) {
      query.set("month", String(selectedMonth));
    }

    if (selectedStatus) {
      query.set("status", selectedStatus);
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
          <h1>Billing Period</h1>
          <p>Kelola periode tagihan.</p>
        </div>

        <GeneratePeriodButton />
      </div>

      <div className="card">
        <form method="GET" className="table-filter">
          <div className="filter-group">
            <label htmlFor="year">Tahun</label>

            <select
              id="year"
              name="year"
              defaultValue={selectedYear ?? ""}
            >
              <option value="">Semua tahun</option>

              {years.map((item) => (
                <option
                  key={item.year}
                  value={item.year}
                >
                  {item.year}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="month">Bulan</label>

            <select
              id="month"
              name="month"
              defaultValue={selectedMonth ?? ""}
            >
              <option value="">Semua bulan</option>

              {Array.from(
                { length: 12 },
                (_, index) => index + 1
              ).map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="status">Status</label>

            <select
              id="status"
              name="status"
              defaultValue={selectedStatus ?? ""}
            >
              <option value="">Semua status</option>
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="filter-actions">
            <button
              type="submit"
              className="filter-button"
            >
              Filter
            </button>

            <a
              href="/bendahara/billing-periods"
              className="reset-filter-button"
            >
              Reset
            </a>
          </div>
        </form>

        {periods.length === 0 ? (
          <div className="empty-state">
            <h3>
              {totalItems === 0
                ? "Belum ada billing period"
                : "Tidak ada data"}
            </h3>

            <p>
              {totalItems === 0
                ? "Billing period yang sudah dibuat akan ditampilkan di sini."
                : "Tidak ada billing period yang sesuai dengan filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aksi</th>
                    <th>Tahun</th>
                    <th>Bulan</th>
                    <th>Mulai</th>
                    <th>Selesai</th>
                    <th>Status</th>
                    <th>Bills</th>
                  </tr>
                </thead>

                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <td>
                        <GenerateBillsButton
                          periodId={period.id}
                          periodStatus={period.status}
                          billGenerationStatus={
                            period.bill_generation_status
                          }
                        />
                      </td>

                      <td>{period.year}</td>
                      <td>{period.month}</td>

                      <td>
                        {period.start_date.toLocaleDateString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>

                      <td>
                        {period.end_date.toLocaleDateString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge status-${period.status.toLowerCase()}`}
                        >
                          {period.status}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge status-${period.bill_generation_status.toLowerCase()}`}
                        >
                          {period.bill_generation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span className="table-info">
                Menampilkan {offset + 1}–
                {Math.min(
                  offset + PAGE_SIZE,
                  totalItems
                )}{" "}
                dari {totalItems} data
              </span>

              {totalPages > 1 && (
                <div className="pagination">
                  {currentPage > 1 ? (
                    <a
                      href={buildPageUrl(
                        currentPage - 1
                      )}
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
                      href={buildPageUrl(
                        currentPage + 1
                      )}
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