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

    // Cek billing period yang sudah ada
    const existingPeriods = await sql`
      SELECT
        month
      FROM billing_periods
      WHERE year = ${year}
      ORDER BY month
    `;

    const existingMonths = existingPeriods.map(
      (period) => Number(period.month)
    );

    // Semua 12 bulan sudah ada
    if (existingMonths.length === 12) {
      return NextResponse.json({
        success: false,
        status: "COMPLETE",
        message: `Billing period tahun ${year} sudah lengkap.`,
      });
    }

    // Cari bulan yang belum ada
    const missingMonths = Array.from(
      { length: 12 },
      (_, index) => index + 1
    ).filter((month) => !existingMonths.includes(month));

    // Generate hanya bulan yang belum ada
    for (const month of missingMonths) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

      const nextMonth =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const endDate = new Date(`${nextMonth}T00:00:00Z`);
      endDate.setUTCDate(endDate.getUTCDate() - 1);

      const endDateString = endDate.toISOString().slice(0, 10);

      await sql`
        INSERT INTO billing_periods (
          year,
          month,
          start_date,
          end_date,
          status
        )
        VALUES (
          ${year},
          ${month},
          ${startDate},
          ${endDateString},
          'DRAFT'
        )
      `;
    }

    return NextResponse.json({
      success: true,
      status: "GENERATED",
      year,
      generatedMonths: missingMonths,
      message: `Billing period tahun ${year} berhasil dibuat.`,
    });
  } catch (error) {
    console.error("Generate billing period error:", error);

    return NextResponse.json(
      { message: "Gagal membuat billing period." },
      { status: 500 }
    );
  }
}