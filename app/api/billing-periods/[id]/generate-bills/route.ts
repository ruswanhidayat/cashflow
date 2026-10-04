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

    if (period.status !== "DRAFT") {
      return NextResponse.json(
        {
          message:
            "Bills hanya dapat di-generate untuk billing period dengan status DRAFT.",
        },
        {
          status: 400,
        }
      );
    }

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
        ORDER BY br.valid_from DESC, br.id DESC
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
        ORDER BY br.valid_from DESC, br.id DESC
        LIMIT 1
      ) br ON TRUE
      LEFT JOIN bills b
        ON b.user_id = u.id
        AND b.period_id = ${periodId}
        AND b.cash_type_id = ct.id
      WHERE u.is_active = TRUE
        AND u.position_id IS NOT NULL
    `;

    const expectedCount = expectedResult[0].expected_count;
    const generatedCount = expectedResult[0].generated_count;

    const generationStatus =
      expectedCount === generatedCount
        ? "COMPLETED"
        : "PARTIAL";

    await sql`
      UPDATE billing_periods
      SET
        bill_generation_status = ${generationStatus},
        updated_at = NOW()
      WHERE id = ${periodId}
    `;

    return NextResponse.json({
      success: true,
      message:
        generationStatus === "COMPLETED"
          ? "Bills berhasil di-generate."
          : "Bills berhasil di-generate sebagian.",
      periodId,
      billGenerationStatus: generationStatus,
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