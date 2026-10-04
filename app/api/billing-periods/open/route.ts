import { NextResponse } from "next/server";

import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const openedPeriods = await sql`
      UPDATE billing_periods
      SET
        status = 'OPEN',
        updated_at = NOW()
      WHERE status = 'DRAFT'
        AND start_date <= (
          CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta'
        )::date
      RETURNING
        id,
        year,
        month,
        start_date,
        end_date,
        status
    `;

    return NextResponse.json({
      success: true,
      openedCount: openedPeriods.length,
      periods: openedPeriods,
    });
  } catch (error) {
    console.error("Open billing period error:", error);

    return NextResponse.json(
      {
        message: "Gagal membuka billing period.",
      },
      {
        status: 500,
      }
    );
  }
}