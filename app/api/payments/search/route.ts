import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sql } from "@/lib/db";

const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_PAGE_SIZES = [10, 25, 50] as const;

type Session = {
  userId: number;
  role: string;
};

type SearchFilters = {
  name?: unknown;
  month?: unknown;
  year?: unknown;
  status?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

const ALLOWED_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
] as const;

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

function parseIntegerArray(
  value: unknown,
  max?: number
): number[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const result: number[] = [];

  for (const item of value) {
    const parsed = parsePositiveInteger(item);

    if (
      parsed === null ||
      (max !== undefined && parsed > max)
    ) {
      return null;
    }

    result.push(parsed);
  }

  return [...new Set(result)];
}

export async function POST(request: Request) {
  try {
    // 1. Validasi sesi
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
      !Number.isSafeInteger(session.userId) ||
      session.userId <= 0 ||
      !["USER", "BEND"].includes(session.role)
    ) {
      return jsonError("Akses ditolak.", 403);
    }

    // 2. Validasi akun aktif dan role di database
    const users = await sql`
      SELECT u.id
      FROM users u
      INNER JOIN user_roles ur
        ON ur.user_id = u.id
      INNER JOIN roles r
        ON r.id = ur.role_id
      WHERE u.id = ${session.userId}
        AND u.is_active = TRUE
        AND r.code = ${session.role}
        AND r.is_active = TRUE
      LIMIT 1
    `;

    if (users.length === 0) {
      return jsonError(
        "Akun tidak aktif atau tidak memiliki akses.",
        403
      );
    }

    // 3. Validasi body
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

    // 4. Filter nama
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
      session.role === "BEND" &&
      typeof body.name === "string"
        ? body.name.trim().slice(0, 100)
        : "";

    // 5. Filter bulan
    const months = parseIntegerArray(body.month, 12);

    if (
      months === null ||
      months.some((month) => month < 1)
    ) {
      return jsonError("Filter bulan tidak valid.", 400);
    }

    // 6. Filter tahun
    const years = parseIntegerArray(body.year);

    if (
      years === null ||
      years.some((year) => year < 1900 || year > 9999)
    ) {
      return jsonError("Filter tahun tidak valid.", 400);
    }

    // 7. Filter status
    let status: string | null = null;

    if (body.status !== undefined && body.status !== "") {
      if (
        typeof body.status !== "string" ||
        !ALLOWED_STATUSES.includes(
          body.status as (typeof ALLOWED_STATUSES)[number]
        )
      ) {
        return jsonError("Filter status tidak valid.", 400);
      }

      status = body.status;
    }

    // 8. Nomor halaman
    let requestedPage = 1;

    if (body.page !== undefined) {
      const parsedPage = parsePositiveInteger(body.page);

      if (parsedPage === null) {
        return jsonError("Nomor halaman tidak valid.", 400);
      }

      requestedPage = parsedPage;
    }

    // 9. Jumlah data per halaman
    let pageSize = DEFAULT_PAGE_SIZE;

    if (body.pageSize !== undefined) {
      const parsedPageSize = parsePositiveInteger(
        body.pageSize
      );

      if (
        parsedPageSize === null ||
        !ALLOWED_PAGE_SIZES.includes(
          parsedPageSize as (typeof ALLOWED_PAGE_SIZES)[number]
        )
      ) {
        return jsonError(
          "Jumlah data per halaman harus 10, 25, atau 50.",
          400
        );
      }

      pageSize = parsedPageSize;
    }

    // Gunakan string array agar parameter filter aman
    // dan konsisten dengan pola API Bills.
    const monthsCsv = months.join(",");
    const yearsCsv = years.join(",");

    // 10. Hitung total data sesuai filter dan role
    const countResult = await sql`
      SELECT COUNT(*) AS total
      FROM payments pay
      INNER JOIN users u
        ON u.id = pay.user_id
      WHERE
        (
          ${session.role} = 'BEND'
          OR pay.user_id = ${session.userId}
        )
        AND (
          ${name} = ''
          OR u.name ILIKE ${"%" + name + "%"}
        )
        AND (
          ${monthsCsv} = ''
          OR EXTRACT(MONTH FROM pay.payment_date)::integer
            = ANY(
              string_to_array(${monthsCsv}, ',')::integer[]
            )
        )
        AND (
          ${yearsCsv} = ''
          OR EXTRACT(YEAR FROM pay.payment_date)::integer
            = ANY(
              string_to_array(${yearsCsv}, ',')::integer[]
            )
        )
        AND (
          ${status}::varchar IS NULL
          OR pay.status = ${status}
        )
    `;

    const totalItems = Number(countResult[0].total);

    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / pageSize)
    );

    const currentPage = Math.min(
      requestedPage,
      totalPages
    );

    const offset = (currentPage - 1) * pageSize;

    // 11. Ambil data untuk halaman aktif
    const payments = await sql`
      SELECT
        pay.id,
        pay.user_id,
        u.name AS user_name,
        pay.amount,
        pay.amount_approved,
        pay.payment_date,
        pay.payment_method,
        pay.entry_type,
        pay.status,
        pay.approval_note,
        pay.created_at,
        pay.confirmed_at
      FROM payments pay
      INNER JOIN users u
        ON u.id = pay.user_id
      WHERE
        (
          ${session.role} = 'BEND'
          OR pay.user_id = ${session.userId}
        )
        AND (
          ${name} = ''
          OR u.name ILIKE ${"%" + name + "%"}
        )
        AND (
          ${monthsCsv} = ''
          OR EXTRACT(MONTH FROM pay.payment_date)::integer
            = ANY(
              string_to_array(${monthsCsv}, ',')::integer[]
            )
        )
        AND (
          ${yearsCsv} = ''
          OR EXTRACT(YEAR FROM pay.payment_date)::integer
            = ANY(
              string_to_array(${yearsCsv}, ',')::integer[]
            )
        )
        AND (
          ${status}::varchar IS NULL
          OR pay.status = ${status}
        )
      ORDER BY
        pay.payment_date DESC,
        pay.id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    // 12. Opsi tahun berdasarkan tanggal pembayaran
    const yearOptions = await sql`
      SELECT DISTINCT
        EXTRACT(YEAR FROM payment_date)::integer AS year
      FROM payments
      WHERE
        (
          ${session.role} = 'BEND'
          OR user_id = ${session.userId}
        )
      ORDER BY year DESC
    `;

    return NextResponse.json({
      data: payments,
      pagination: {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages,
      },
      options: {
        years: yearOptions.map((item) => ({
          value: String(item.year),
          label: String(item.year),
        })),
      },
    });
  } catch (error) {
    console.error(
      "POST /api/payments/search error:",
      error
    );

    return jsonError(
      "Gagal mengambil data pembayaran.",
      500
    );
  }
}