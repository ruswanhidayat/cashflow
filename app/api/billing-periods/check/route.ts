import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const year = Number(body.year);

    if (!year || year < 2000 || year > 2100) {
      return NextResponse.json(
        { message: "Tahun tidak valid." },
        { status: 400 }
      );
    }

    const periods = await sql`
      SELECT
        month
      FROM billing_periods
      WHERE year = ${year}
      ORDER BY month
    `;

    const existingMonths = periods.map(
      (period) => Number(period.month)
    );

    return NextResponse.json({
      year,
      existingCount: existingMonths.length,
      missingCount: 12 - existingMonths.length,
      existingMonths,
    });
  } catch (error) {
    console.error("Check billing period error:", error);

    return NextResponse.json(
      { message: "Gagal mengecek billing period." },
      { status: 500 }
    );
  }
}