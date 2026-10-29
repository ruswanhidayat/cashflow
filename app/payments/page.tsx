import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";

import AppShell from "@/app/components/app-shell";
import PaymentsClient from "./payments-client";

type Role = {
  id: number;
  code: string;
  name: string;
};

type AppRole = "USER" | "BEND";

export default async function PaymentsPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    redirect("/login");
  }

  let session: {
    userId: number;
    role: AppRole;
  };

  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    redirect("/login");
  }

  if (
    !session ||
    !Number.isSafeInteger(session.userId) ||
    session.userId <= 0 ||
    !["USER", "BEND"].includes(session.role)
  ) {
    redirect("/login");
  }

  const users = await sql`
    SELECT
      u.id,
      u.name
    FROM users u
    WHERE u.id = ${session.userId}
      AND u.is_active = TRUE
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

  if (!roles.some((role) => role.code === session.role)) {
    redirect("/login");
  }

  return (
    <AppShell
      userName={user.name}
      currentRole={session.role}
      roles={roles}
    >
      <PaymentsClient role={session.role} />
    </AppShell>
  );
}