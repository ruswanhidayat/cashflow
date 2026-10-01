import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeId = body.employeeId?.trim();

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

    return NextResponse.json({
      user: {
        id: user.id,
        employeeId: user.employee_id,
        name: user.name,
        positionId: user.position_id,
      },
      roles,
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat memproses login." },
      { status: 500 }
    );
  }
}