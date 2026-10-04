import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sql } from "@/lib/db";

type Session = {
  userId: number;
  role: string;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    let session: Session;

    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        {
          message: "Session tidak valid.",
        },
        {
          status: 401,
        }
      );
    }

    if (session.role !== "BEND") {
      return NextResponse.json(
        {
          message: "Akses ditolak.",
        },
        {
          status: 403,
        }
      );
    }

    const { id } = await context.params;
    const periodId = Number(id);

    if (!Number.isInteger(periodId) || periodId <= 0) {
      return NextResponse.json(
        {
          message: "Billing period tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

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
      WHERE id = ${periodId}
      LIMIT 1
    `;

    if (periods.length === 0) {
      return NextResponse.json(
        {
          message: "Billing period tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    const period = periods[0];

    /*
     * Bills hanya dapat di-generate untuk billing period OPEN.
     */
    if (period.status !== "OPEN") {
      return NextResponse.json(
        {
          message:
            "Bills hanya dapat di-generate untuk billing period dengan status OPEN.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Billing period OPEN hanya boleh berada pada
     * status NOT_GENERATED atau PARTIAL.
     */
    if (
      period.bill_generation_status !== "NOT_GENERATED" &&
      period.bill_generation_status !== "PARTIAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Billing period ini tidak dapat melakukan generate bills lagi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Generate bills untuk:
     * - user aktif
     * - memiliki position
     * - cash type aktif
     * - memiliki bill reference yang berlaku
     */
    const insertedBills = await sql`
      INSERT INTO bills (
        user_id,
        period_id,
        cash_type_id,
        bill_reference_id,
        amount
      )
      SELECT
        u.id,
        ${periodId},
        ct.id,
        br.id,
        br.amount
      FROM users u
      INNER JOIN cash_types ct
        ON ct.is_active = TRUE
      INNER JOIN LATERAL (
        SELECT
          br.id,
          br.amount
        FROM bill_references br
        WHERE br.position_id = u.position_id
          AND br.cash_type_id = ct.id
          AND br.is_active = TRUE
          AND br.valid_from <= ${period.start_date}
          AND (
            br.valid_to IS NULL
            OR br.valid_to >= ${period.start_date}
          )
        ORDER BY
          br.valid_from DESC,
          br.id DESC
        LIMIT 1
      ) br ON TRUE
      WHERE u.is_active = TRUE
        AND u.position_id IS NOT NULL
      ON CONFLICT (
        user_id,
        period_id,
        cash_type_id
      )
      DO NOTHING
      RETURNING id
    `;

    /*
     * Hitung total bill yang seharusnya ada
     * dan total bill yang sudah tersedia.
     */
    const expectedResult = await sql`
      SELECT
        COUNT(*)::int AS expected_count,
        COUNT(b.id)::int AS generated_count
      FROM users u
      INNER JOIN cash_types ct
        ON ct.is_active = TRUE
      INNER JOIN LATERAL (
        SELECT
          br.id
        FROM bill_references br
        WHERE br.position_id = u.position_id
          AND br.cash_type_id = ct.id
          AND br.is_active = TRUE
          AND br.valid_from <= ${period.start_date}
          AND (
            br.valid_to IS NULL
            OR br.valid_to >= ${period.start_date}
          )
        ORDER BY
          br.valid_from DESC,
          br.id DESC
        LIMIT 1
      ) br ON TRUE
      LEFT JOIN bills b
        ON b.user_id = u.id
        AND b.period_id = ${periodId}
        AND b.cash_type_id = ct.id
      WHERE u.is_active = TRUE
        AND u.position_id IS NOT NULL
    `;

    const expectedCount = Number(
      expectedResult[0].expected_count
    );

    const generatedCount = Number(
      expectedResult[0].generated_count
    );

    const isComplete =
      expectedCount === generatedCount;

    if (isComplete) {
      /*
       * Semua bill sudah tersedia.
       * Billing period selesai dan ditutup.
       */
      await sql`
        UPDATE billing_periods
        SET
          status = 'CLOSED',
          bill_generation_status = 'GENERATED',
          updated_at = NOW()
        WHERE id = ${periodId}
      `;
    } else {
      /*
       * Masih ada bill yang belum tersedia.
       * Period tetap OPEN agar dapat di-generate lagi.
       */
      await sql`
        UPDATE billing_periods
        SET
          status = 'OPEN',
          bill_generation_status = 'PARTIAL',
          updated_at = NOW()
        WHERE id = ${periodId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: isComplete
        ? "Bills berhasil di-generate. Billing period ditutup."
        : "Bills berhasil di-generate sebagian.",
      periodId,
      billGenerationStatus: isComplete
        ? "GENERATED"
        : "PARTIAL",
      periodStatus: isComplete
        ? "CLOSED"
        : "OPEN",
      generatedCount: insertedBills.length,
      totalBillCount: generatedCount,
      expectedBillCount: expectedCount,
    });
  } catch (error) {
    console.error("Generate bills error:", error);

    return NextResponse.json(
      {
        message: "Gagal melakukan generate bills.",
      },
      {
        status: 500,
      }
    );
  }
}