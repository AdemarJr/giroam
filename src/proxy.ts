import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "giroam_session";

async function readRole(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return String(payload.role ?? "");
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await readRole(request);

  const needsAuth =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/organizador") ||
    pathname.startsWith("/capitao") ||
    pathname.startsWith("/me") ||
    pathname.startsWith("/api/reports");

  if (needsAuth && !role) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/admin") && role !== "admin" && role !== "super_admin") {
    return NextResponse.redirect(new URL("/me", request.url));
  }

  // /organizador: qualquer autenticado pode solicitar o perfil;
  // páginas internas checam isOrganizer + aprovação.

  if (
    pathname.startsWith("/capitao") &&
    role !== "captain" &&
    role !== "super_admin" &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/me", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/organizador/:path*",
    "/capitao/:path*",
    "/me",
    "/api/reports/:path*",
  ],
};
