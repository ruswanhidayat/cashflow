import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sql } from "@/lib/db";

const PAGE_SIZE = 10;

type Session = {
  userId: number;
  role: string;
};

type SearchFilters = {
  year?: unknown;
  month?: unknown;
  status?: unknown;
  page?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function parsePositiveInteger(value: unknown): number | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    !/^\d+$/.test(value)
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

export async function POST(request: Request) {
  try {
    // 1. Validasi session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return jsonError("Sesi tidak ditemukan.", 401);
    }

    let session: Session;

    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return jsonError("Sesi tidak valid.", 401);
    }

    if (
      !session ||
      session.role !== "BEND" ||
      !Number.isSafeInteger(session.userId) ||
      session.userId <= 0
    ) {
      return jsonError("Akses ditolak.", 403);
    }

    // 2. Pastikan akun aktif dan memiliki role bendahara
    const users = await sql`
      SELECT u.id
      FROM users u
      INNER JOIN user_roles ur
        ON ur.user_id = u.id
      INNER JOIN roles r
        ON r.id = ur.role_id
      WHERE u.id = ${session.userId}
        AND u.is_active = TRUE
        AND r.code = 'BEND'
        AND r.is_active = TRUE
      LIMIT 1
    `;

    if (users.length === 0) {
      return jsonError(
        "Akun tidak aktif atau tidak memiliki akses bendahara.",
        403
      );
    }

    // 3. Validasi body JSON
    let body: SearchFilters;

    try {
      body = await request.json();
    } catch {
      return jsonError("Body JSON tidak valid.", 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return jsonError("Format request tidak valid.", 400);
    }

    // 4. Validasi tahun
    let year: number | null = null;

    if (body.year !== undefined && body.year !== "") {
      if (
        typeof body.year !== "string" &&
        typeof body.year !== "number"
      ) {
        return jsonError("Filter tahun tidak valid.", 400);
      }

      const yearText = String(body.year);

      if (!/^\d{4}$/.test(yearText)) {
        return jsonError("Filter tahun tidak valid.", 400);
      }

      year = Number(yearText);
    }

    // 5. Validasi bulan
    let month: number | null = null;

    if (body.month !== undefined && body.month !== "") {
      month = parsePositiveInteger(body.month);

      if (month === null || month > 12) {
        return jsonError("Filter bulan tidak valid.", 400);
      }
    }

    // 6. Validasi status
    let status: string | null = null;

    if (body.status !== undefined && body.status !== "") {
      if (
        body.status !== "DRAFT" &&
        body.status !== "OPEN" &&
        body.status !== "CLOSED"
      ) {
        return jsonError("Filter status tidak valid.", 400);
      }

      status = body.status;
    }

    // 7. Validasi halaman
    let requestedPage = 1;

    if (body.page !== undefined) {
      const parsedPage = parsePositiveInteger(body.page);

      if (parsedPage === null) {
        return jsonError("Nomor halaman tidak valid.", 400);
      }

      requestedPage = parsedPage;
    }

    // 8. Ambil jumlah data sesuai filter
    const countResult = await sql`
      SELECT COUNT(*) AS total
      FROM billing_periods
      WHERE
        (${year}::integer IS NULL OR year = ${year})
        AND (
          ${month}::integer IS NULL
          OR month = ${month}
        )
        AND (
          ${status}::varchar IS NULL
          OR status = ${status}
        )
    `;

    const totalItems = Number(countResult[0].total);

    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / PAGE_SIZE)
    );

    const currentPage = Math.min(
      requestedPage,
      totalPages
    );

    const offset = (currentPage - 1) * PAGE_SIZE;

    // 9. Ambil data halaman aktif
    const periods = await sql`
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
        (${year}::integer IS NULL OR year = ${year})
        AND (
          ${month}::integer IS NULL
          OR month = ${month}
        )
        AND (
          ${status}::varchar IS NULL
          OR status = ${status}
        )
      ORDER BY
				CASE
					WHEN status = 'OPEN'
						AND bill_generation_status <> 'GENERATED' THEN 1
					WHEN status = 'OPEN'
						AND bill_generation_status = 'GENERATED' THEN 2
					WHEN status = 'DRAFT' THEN 3
					WHEN status = 'CLOSED' THEN 4
					ELSE 5
				END ASC,
				year ASC,
				month ASC
			LIMIT ${PAGE_SIZE}
			OFFSET ${offset}
    `;

    // 10. Ambil opsi tahun untuk dropdown filter
    const years = await sql`
      SELECT DISTINCT year
      FROM billing_periods
      ORDER BY year DESC
    `;

    // 11. Kembalikan data dan metadata pagination
    return NextResponse.json({
      data: periods,
      pagination: {
        page: currentPage,
        pageSize: PAGE_SIZE,
        totalItems,
        totalPages,
      },
      options: {
        years: years.map((item) => ({
          value: String(item.year),
          label: String(item.year),
        })),
      },
    });
  } catch (error) {
    console.error("POST /api/billing-periods/search error:", error);

    return jsonError(
      "Gagal mengambil data billing period.",
      500
    );
  }
}