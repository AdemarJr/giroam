import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { isAdminRole } from "@/lib/auth/roles";

export const SESSION_COOKIE = "giroam_session";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: "super_admin" | "admin" | "organizer" | "captain" | "participant";
  photoUrl: string | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não definida");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    role: user.role,
    photoUrl: user.photoUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      cpf: String(payload.cpf),
      role: payload.role as SessionUser["role"],
      photoUrl: (payload.photoUrl as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** Recarrega o usuário do banco (papel atualizado, conta ativa). */
export async function loadUserById(id: string): Promise<SessionUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    role: user.role,
    photoUrl: user.photoUrl,
  };
}

export async function requireUser(roles?: SessionUser["role"][]) {
  const cookieUser = await readSession();
  if (!cookieUser) throw new Error("Não autenticado");

  const user = (await loadUserById(cookieUser.id)) ?? cookieUser;
  if (roles && !roles.includes(user.role) && !isAdminRole(user.role)) {
    throw new Error("Sem permissão");
  }
  return user;
}

export async function requireAdmin() {
  return requireUser(["admin", "super_admin"]);
}

export async function requireSuperAdmin() {
  const user = await requireUser(["super_admin"]);
  if (user.role !== "super_admin") {
    throw new Error("Somente Super Admin");
  }
  return user;
}

export async function requireCaptain() {
  return requireUser(["captain", "super_admin"]);
}

export async function requireOrganizer() {
  const user = await requireUser(["organizer", "super_admin"]);
  if (user.role !== "organizer" && user.role !== "super_admin") {
    throw new Error("Somente Organizador");
  }
  return user;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function authenticate(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    role: user.role,
    photoUrl: user.photoUrl,
  } satisfies SessionUser;
}
