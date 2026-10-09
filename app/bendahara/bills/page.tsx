
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";

import AppShell from "@/app/components/app-shell";
import BillsTable from "./bills-table";

type Role = {
  id: number;
  code: string;
  name: string;
};

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

      <BillsTable />
    </AppShell>
  );
}
