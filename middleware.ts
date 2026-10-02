import { NextRequest, NextResponse } from "next/server";

const SESSION_MAX_AGE = 180 * 60 * 1000;
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000;

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get("session");

  // =========================================================
  // Tidak ada session
  // =========================================================

  if (!sessionCookie) {
    // Kalau sudah di login, biarkan halaman login tampil
    if (pathname === "/login") {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const session = JSON.parse(sessionCookie.value);

    const now = Date.now();

    const loginAt = Number(session.loginAt);
    const lastActivityAt = Number(session.lastActivityAt);

    // =========================================================
    // Validasi session
    // =========================================================

    const sessionExpired =
      !loginAt || now - loginAt >= SESSION_MAX_AGE;

    const idleExpired =
      !lastActivityAt ||
      now - lastActivityAt >= SESSION_IDLE_TIMEOUT;

    if (sessionExpired || idleExpired) {
      const response = NextResponse.redirect(
        new URL("/login", request.url)
      );

      response.cookies.delete("session");

      return response;
    }

    // =========================================================
    // Sudah login tetapi membuka /login
    // =========================================================

    if (pathname === "/login") {
      if (session.role === "USER") {
        return NextResponse.redirect(
          new URL("/home", request.url)
        );
      }

      if (session.role === "BEND") {
        return NextResponse.redirect(
          new URL("/bendahara", request.url)
        );
      }

      // Role tidak dikenal
      const response = NextResponse.redirect(
        new URL("/login", request.url)
      );

      response.cookies.delete("session");

      return response;
    }

    // =========================================================
    // Update activity
    // =========================================================

    session.lastActivityAt = now;

    const response = NextResponse.next();

    response.cookies.set(
      "session",
      JSON.stringify(session),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 3,
      }
    );

    // =========================================================
    // Role-based access
    // =========================================================

    if (
      pathname === "/home" ||
      pathname.startsWith("/home/")
    ) {
      if (session.role !== "USER") {
        return NextResponse.redirect(
          new URL("/bendahara", request.url)
        );
      }
    }

    if (
      pathname === "/bendahara" ||
      pathname.startsWith("/bendahara/")
    ) {
      if (session.role !== "BEND") {
        return NextResponse.redirect(
          new URL("/home", request.url)
        );
      }
    }

    return response;
  } catch {
    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.delete("session");

    return response;
  }
}

export const config = {
  matcher: [
    "/login",
    "/home/:path*",
    "/bendahara/:path*",
  ],
};