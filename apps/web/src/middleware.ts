import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const PENDING_COOKIE = "karibu_pending_token";

export async function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) return NextResponse.next();

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      return NextResponse.redirect(
        new URL("/error-page?key=invalid_token", request.url)
      );
    }

    const data = await res.json();

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(PENDING_COOKIE, JSON.stringify(data), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });

    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/error-page?key=server_error", request.url)
    );
  }
}

export const config = {
  matcher: ["/"],
};
