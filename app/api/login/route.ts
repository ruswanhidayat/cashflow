import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const employeeId = body.employeeId?.trim();
    const roleCode = body.roleCode?.trim();

    if (!employeeId) {
      return NextResponse.json(
        { message: "ID Pegawai wajib diisi." },
        { status: 400 }
      );
    }

    const users = await sql`
      SELECT
        u.id,
        u.employee_id,
        u.name,
        u.position_id
      FROM users u
      WHERE u.employee_id = ${employeeId}
        AND u.is_active = TRUE
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { message: "ID Pegawai tidak ditemukan." },
        { status: 401 }
      );
    }

    const user = users[0];

    const roles = await sql`
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
    `;

    if (roles.length === 0) {
      return NextResponse.json(
        { message: "User belum memiliki role." },
        { status: 403 }
      );
    }

    let selectedRole;

    if (roles.length === 1) {
      selectedRole = roles[0];
    } else {
      if (!roleCode) {
        return NextResponse.json({
          requiresRoleSelection: true,
          user: {
            id: user.id,
            employeeId: user.employee_id,
            name: user.name,
          },
          roles,
        });
      }

      selectedRole = roles.find(
        (role) => role.code === roleCode
      );

      if (!selectedRole) {
        return NextResponse.json(
          { message: "Role yang dipilih tidak valid." },
          { status: 403 }
        );
      }
    }

    const now = Date.now();

    const response = NextResponse.json({
    success: true,
    role: selectedRole.code,
    });

    response.cookies.set(
    "session",
    JSON.stringify({
        userId: user.id,
        role: selectedRole.code,
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

    console.time("LOGIN TOTAL");

    console.time("USER QUERY");

    const users = await sql`
      SELECT
        id,
        employee_id,
        name,
        position_id
      FROM users
      WHERE employee_id = ${employeeId}
        AND is_active = true
      LIMIT 1
    `;

    console.timeEnd("USER QUERY");

    console.time("ROLE QUERY");

    const roles = await sql`
      SELECT
        r.id,
        r.code,
        r.name
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ${user.id}
        AND r.is_active = true
    `;

    console.timeEnd("ROLE QUERY");

    console.timeEnd("LOGIN TOTAL");
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat memproses login." },
      { status: 500 }
    );
  }
}