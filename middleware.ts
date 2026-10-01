import { NextRequest, NextResponse } from "next/server";

const SESSION_MAX_AGE = 180 * 60 * 1000;
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000;

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const session = JSON.parse(sessionCookie.value);

    const now = Date.now();

    const loginAt = Number(session.loginAt);
    const lastActivityAt = Number(session.lastActivityAt);

    const sessionExpired =
      !loginAt || now - loginAt >= SESSION_MAX_AGE;

    const idleExpired =
      !lastActivityAt || now - lastActivityAt >= SESSION_IDLE_TIMEOUT;

    if (sessionExpired || idleExpired) {
      const response = NextResponse.redirect(
        new URL("/login", request.url)
      );

      response.cookies.delete("session");

      return response;
    }

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
    "/home/:path*",
    "/bendahara/:path*",
  ],
};