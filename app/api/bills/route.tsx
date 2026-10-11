
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sql } from "@/lib/db";

const PAGE_SIZE = 10;

type Session = {
  userId: number;
  role: string;
};

type BillFilters = {
  name?: unknown;
  month?: unknown;
  year?: unknown;
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
    // 1. Validasi sesi dan role
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

    // 2. Pastikan pengguna masih aktif
    const users = await sql`
      SELECT id
      FROM users
      WHERE id = ${session.userId}
        AND is_active = TRUE
      LIMIT 1
    `;

    if (users.length === 0) {
      return jsonError(
        "Akun tidak aktif atau tidak ditemukan.",
        403
      );
    }

    // 3. Validasi body JSON
    let body: BillFilters;

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

    // 4. Validasi filter nama
    if (
      body.name !== undefined &&
      typeof body.name !== "string"
    ) {
      return jsonError(
        "Filter nama harus berupa teks.",
        400
      );
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim().slice(0, 100)
        : "";

    // 5. Validasi filter bulan
    let month: number | null = null;

    if (
      body.month !== undefined &&
      body.month !== ""
    ) {
      month = parsePositiveInteger(body.month);

      if (month === null || month < 1 || month > 12) {
        return jsonError(
          "Filter bulan tidak valid.",
          400
        );
      }
    }

    // 6. Validasi filter tahun
    let year: number | null = null;

    if (
      body.year !== undefined &&
      body.year !== ""
    ) {
      year = parsePositiveInteger(body.year);

      if (year === null) {
        return jsonError(
          "Filter tahun tidak valid.",
          400
        );
      }
    }

    // 7. Validasi halaman
    let requestedPage = 1;

    if (body.page !== undefined) {
      const parsedPage = parsePositiveInteger(body.page);

      if (parsedPage === null) {
        return jsonError(
          "Nomor halaman tidak valid.",
          400
        );
      }

      requestedPage = parsedPage;
    }

    // 8. Ambil opsi tahun dari periode yang memiliki tagihan
    const years = await sql`
      SELECT DISTINCT
        bp.year
      FROM billing_periods bp
      INNER JOIN bills b
        ON b.period_id = bp.id
      ORDER BY bp.year DESC
    `;

    // 9. Hitung total baris sesuai filter
    const countResult = await sql`
      SELECT COUNT(*) AS total
      FROM (
        SELECT
          b.user_id,
          b.period_id
        FROM bills b
        INNER JOIN users u
          ON u.id = b.user_id
        INNER JOIN billing_periods bp
          ON bp.id = b.period_id
        WHERE
          (
            ${name} = ''
            OR u.name ILIKE ${"%" + name + "%"}
          )
          AND (
            ${month}::integer IS NULL
            OR bp.month = ${month}
          )
          AND (
            ${year}::integer IS NULL
            OR bp.year = ${year}
          )
        GROUP BY
          b.user_id,
          b.period_id
      ) filtered_bills
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

    // 10. Ambil data untuk halaman aktif
    const bills = await sql`
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
      WHERE
        (
          ${name} = ''
          OR u.name ILIKE ${"%" + name + "%"}
        )
        AND (
          ${month}::integer IS NULL
          OR bp.month = ${month}
        )
        AND (
          ${year}::integer IS NULL
          OR bp.year = ${year}
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
    `;

    // 11. Respons untuk halaman
    return NextResponse.json({
      data: bills,
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
    console.error("POST /api/bills error:", error);

    return jsonError(
      "Gagal mengambil data tagihan.",
      500
    );
  }
}
