import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function BendaharaPage() {
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

  if (session.role !== "BEND") {
    redirect("/login");
  }

  return (
    <main>
      <h1>Halaman Bendahara</h1>
      <p>User ID: {session.userId}</p>
      <p>Role: {session.role}</p>
    </main>
  );
}