import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sql } from "@/lib/db";
import { generateId } from "@/lib/transaction-ref";

type Session = {
  userId: number;
  role: string;
};

type BillCandidate = {
  user_id: number;
  cash_type_id: number;
};

type BillTransactionRef = BillCandidate & {
  transaction_ref: string;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    // 1. Validasi session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    let session: Session;

    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { message: "Session tidak valid." },
        { status: 401 }
      );
    }

    if (session.role !== "BEND") {
      return NextResponse.json(
        { message: "Akses ditolak." },
        { status: 403 }
      );
    }

    // 2. Validasi billing period
    const { id } = await context.params;
    const periodId = Number(id);

    if (!Number.isInteger(periodId) || periodId <= 0) {
      return NextResponse.json(
        { message: "Billing period tidak valid." },
        { status: 400 }
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
        { message: "Billing period tidak ditemukan." },
        { status: 404 }
      );
    }

    const period = periods[0];

    if (period.status !== "OPEN") {
      return NextResponse.json(
        {
          message:
            "Bills hanya dapat di-generate untuk billing period dengan status OPEN.",
        },
        { status: 400 }
      );
    }

    if (
      period.bill_generation_status !== "NOT_GENERATED" &&
      period.bill_generation_status !== "PARTIAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Billing period ini tidak dapat melakukan generate bills lagi.",
        },
        { status: 400 }
      );
    }

    // 3. Siapkan kandidat tagihan dan transaction_ref.
    //
    // Kandidat mencakup:
    // - Tagihan yang sudah ada tetapi belum tercatat di ledger.
    // - Tagihan yang belum ada dan memenuhi syarat untuk dibuat.
    //
    // Setiap kandidat mendapatkan transaction_ref sebelum transaksi DB.
    // Proses INSERT nantinya dibatasi hanya pada kandidat ini.

    const billCandidates = (await sql`
      SELECT
        b.user_id,
        b.cash_type_id
      FROM bills b
      WHERE b.period_id = ${periodId}
        AND NOT EXISTS (
          SELECT 1
          FROM ledger l
          WHERE l.reference_type = 'BIL'
            AND l.reference_id = b.id
        )

      UNION

      SELECT
        u.id AS user_id,
        ct.id AS cash_type_id
      FROM users u
      INNER JOIN cash_types ct
        ON ct.is_active = TRUE
      INNER JOIN LATERAL (
        SELECT
          br.id
        FROM bill_references br
        WHERE br.position_id = u.position_id
          AND br.cash_type_id = ct.id
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
        AND NOT EXISTS (
          SELECT 1
          FROM bills b
          WHERE b.user_id = u.id
            AND b.period_id = ${periodId}
            AND b.cash_type_id = ct.id
        )
    `) as BillCandidate[];

    const billPeriod =
      String(period.month).padStart(2, "0") +
      String(period.year);

    const billTransactionRefs: BillTransactionRef[] =
      billCandidates.map((candidate) => ({
        user_id: Number(candidate.user_id),
        cash_type_id: Number(candidate.cash_type_id),
        transaction_ref: generateId(
          "TRX",
          billPeriod,
          "BIL"
        ),
      }));

    const candidateRefsJson = JSON.stringify(
      billTransactionRefs
    );

    // 4. Generate bills, catat ledger, dan update status.
    //
    // Seluruh operasi berikut dijalankan dalam satu transaksi DB.
    // Query INSERT bills dibatasi oleh daftar kandidat di atas,
    // sehingga tidak membuat tagihan baru tanpa transaction_ref.

    const [
      insertedBills,
      insertedLedger,
      updatedBills,
      periodUpdates,
      countResults,
    ] = await sql.transaction([
      // A. Generate bills hanya untuk kandidat yang sudah disiapkan.
      // Tagihan yang sudah ada tidak dibuat ulang.
      sql`
        WITH candidates AS (
          SELECT
            candidate.user_id,
            candidate.cash_type_id
          FROM jsonb_to_recordset(
            ${candidateRefsJson}::jsonb
          ) AS candidate(
            user_id integer,
            cash_type_id integer,
            transaction_ref text
          )
        )
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
        FROM candidates candidate
        INNER JOIN users u
          ON u.id = candidate.user_id
          AND u.is_active = TRUE
        INNER JOIN cash_types ct
          ON ct.id = candidate.cash_type_id
          AND ct.is_active = TRUE
        INNER JOIN LATERAL (
          SELECT
            br.id,
            br.amount
          FROM bill_references br
          WHERE br.position_id = u.position_id
            AND br.cash_type_id = ct.id
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
        WHERE u.position_id IS NOT NULL
        ON CONFLICT (
          user_id,
          period_id,
          cash_type_id
        )
        DO NOTHING
        RETURNING id
      `,

      // B. Catat ledger untuk tagihan yang belum memiliki entri BIL.
      // transaction_ref diambil dari daftar kandidat yang sama.
      sql`
        WITH candidate_refs AS (
          SELECT
            candidate.user_id,
            candidate.cash_type_id,
            candidate.transaction_ref
          FROM jsonb_to_recordset(
            ${candidateRefsJson}::jsonb
          ) AS candidate(
            user_id integer,
            cash_type_id integer,
            transaction_ref text
          )
        )
        INSERT INTO ledger (
          user_id,
          reference_type,
          reference_id,
          transaction_ref,
          matching_ref,
          amount,
          description
        )
        SELECT
          b.user_id,
          'BIL',
          b.id,
          candidate.transaction_ref,
          NULL,
          -b.amount,
          'Pencatatan tagihan #' || b.id::text
        FROM bills b
        INNER JOIN candidate_refs candidate
          ON candidate.user_id = b.user_id
          AND candidate.cash_type_id = b.cash_type_id
        WHERE b.period_id = ${periodId}
          AND NOT EXISTS (
            SELECT 1
            FROM ledger l
            WHERE l.reference_type = 'BIL'
              AND l.reference_id = b.id
          )
        ON CONFLICT (reference_id)
        WHERE reference_type = 'BIL'
          AND reference_id IS NOT NULL
        DO NOTHING
        RETURNING id
      `,

      // C. Isi timestamp untuk tagihan yang sudah tercatat di ledger.
      sql`
        UPDATE bills b
        SET ledger_recorded_at = NOW()
        WHERE b.period_id = ${periodId}
          AND b.ledger_recorded_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM ledger l
            WHERE l.reference_type = 'BIL'
              AND l.reference_id = b.id
          )
        RETURNING id
      `,

      // D. Update status billing period berdasarkan jumlah tagihan.
      sql`
        WITH bill_counts AS (
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
        )
        UPDATE billing_periods bp
        SET
          status = CASE
            WHEN bc.expected_count = bc.generated_count
              THEN 'CLOSED'
            ELSE 'OPEN'
          END,
          bill_generation_status = CASE
            WHEN bc.expected_count = bc.generated_count
              THEN 'GENERATED'
            ELSE 'PARTIAL'
          END,
          updated_at = NOW()
        FROM bill_counts bc
        WHERE bp.id = ${periodId}
        RETURNING
          bp.status,
          bp.bill_generation_status
      `,

      // E. Ambil jumlah tagihan untuk respons.
      sql`
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
      `,
    ]);

    // 5. Susun respons
    const expectedCount = Number(
      countResults[0].expected_count
    );

    const generatedCount = Number(
      countResults[0].generated_count
    );

    const isComplete = expectedCount === generatedCount;

    const updatedPeriod = periodUpdates[0];

    return NextResponse.json({
      success: true,
      message: isComplete
        ? "Bills dan ledger berhasil diproses. Billing period ditutup."
        : "Bills dan ledger berhasil diproses sebagian.",
      periodId,
      billGenerationStatus:
        updatedPeriod.bill_generation_status,
      periodStatus: updatedPeriod.status,
      generatedCount: insertedBills.length,
      ledgerRecordedCount: insertedLedger.length,
      updatedLedgerTimestamps: updatedBills.length,
      totalBillCount: generatedCount,
      expectedBillCount: expectedCount,
    });
  } catch (error) {
    console.error("Generate bills and ledger error:", error);

    return NextResponse.json(
      {
        message:
          "Gagal melakukan generate bills dan pencatatan ledger.",
      },
      { status: 500 }
    );
  }
}