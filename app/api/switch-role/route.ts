import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "Session tidak ditemukan." },
        { status: 401 }
      );
    }

    let session: {
      userId: number;
      role: string;
    };

    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { message: "Session tidak valid." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const roleCode = body.roleCode?.trim();

    if (!roleCode) {
      return NextResponse.json(
        { message: "Role wajib dipilih." },
        { status: 400 }
      );
    }

    const roles = await sql`
      SELECT
        r.id,
        r.code,
        r.name
      FROM user_roles ur
      INNER JOIN roles r
        ON r.id = ur.role_id
      WHERE ur.user_id = ${session.userId}
        AND r.is_active = TRUE
        AND r.code = ${roleCode}
      LIMIT 1
    `;

    if (roles.length === 0) {
      return NextResponse.json(
        { message: "Role yang dipilih tidak valid." },
        { status: 403 }
      );
    }

    const now = Date.now();

    const response = NextResponse.json({
      success: true,
      role: roleCode,
    });

    response.cookies.set(
      "session",
      JSON.stringify({
        userId: session.userId,
        role: roleCode,
        loginAt: now,
        lastActivityAt: now,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 3,
      }
    );

    return response;
  } catch (error) {
    console.error("Switch role error:", error);

    return NextResponse.json(
      { message: "Gagal berpindah role." },
      { status: 500 }
    );
  }
}