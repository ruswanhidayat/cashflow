
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import AppShell from "@/app/components/app-shell";
import DataTable, {
  type DataTableColumn,
  type DataTableHeaderCell,
} from "@/app/components/data-table";

import type {
  TableFilterConfig,
} from "@/app/components/table-column-filters";

type Role = {
  id: number;
  code: string;
  name: string;
};

type BillRow = {
  user_id: number;
  name: string;
  position_name: string | null;
  period_id: number;
  year: number;
  month: number;
  cash_amount: number | string | null;
  pgb_amount: number | string | null;
};

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatAmount(amount: number | string | null) {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return Number(amount).toLocaleString("id-ID");
}

const columns: DataTableColumn<BillRow>[] = [
  {
    key: "name",
    label: "Nama",
  },
  {
    key: "position_name",
    label: "Posisi",
    render: (bill) => bill.position_name ?? "—",
  },
  {
    key: "period",
    label: "Periode",
    render: (bill) =>
      `${MONTHS[bill.month - 1]} ${bill.year}`,
  },
  {
    key: "cash_amount",
    label: "Tagihan Kas",
    align: "right",
    render: (bill) => formatAmount(bill.cash_amount),
  },
  {
    key: "pgb_amount",
    label: "Tagihan Paguyuban",
    align: "right",
    render: (bill) => formatAmount(bill.pgb_amount),
  },
];

const headerRows: DataTableHeaderCell[][] = [
  [
    { label: "Nama", rowSpan: 2 },
    { label: "Posisi", rowSpan: 2 },
    { label: "Periode", rowSpan: 2 },
    { label: "Tagihan", colSpan: 2, align: "center" },
  ],
  [
    { label: "Tagihan Kas", align: "right" },
    { label: "Tagihan Paguyuban", align: "right" },
  ],
];

const filters: TableFilterConfig[] = [
  {
    key: "name",
    type: "text",
    placeholder: "Cari nama...",
  },
  {
    key: "position",
    type: "select",
    placeholder: "Semua posisi",
  },
  {
    key: "period",
    type: "select",
    placeholder: "Semua periode",
  },
];

export default async function BillsPage() {
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

  if (
    session.role !== "BEND" ||
    !Number.isSafeInteger(session.userId) ||
    session.userId <= 0
  ) {
    redirect("/login");
  }

  const users = await sql`
    SELECT id, name
    FROM users
    WHERE id = ${session.userId}
      AND is_active = TRUE
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

  return (
    <AppShell
      userName={user.name}
      currentRole={session.role}
      roles={roles}
    >
      <div className="page-heading">
        <div>
          <h1>Data Tagihan</h1>
          <p>
            Lihat data tagihan pegawai berdasarkan periode
            dan jenis kas.
          </p>
        </div>
      </div>

      <DataTable<BillRow>
        endpoint="/api/bills"
        columns={columns}
        headerRows={headerRows}
        filters={filters}
        pageSize={10}
        getRowKey={(bill) =>
          `${bill.user_id}-${bill.period_id}`
        }
      />
    </AppShell>
  );
}
