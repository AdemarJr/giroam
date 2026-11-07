import type { SessionUser } from "@/lib/auth/session";

export type UserRole = SessionUser["role"];

/** Super Admin e Admin de operação do campeonato */
export function isAdminRole(role: UserRole | null | undefined) {
  return role === "super_admin" || role === "admin";
}

export function isSuperAdmin(role: UserRole | null | undefined) {
  return role === "super_admin";
}

export function isCaptain(role: UserRole | null | undefined) {
  return role === "captain" || isSuperAdmin(role);
}

export function homePathForRole(role: UserRole) {
  if (isAdminRole(role)) return "/admin";
  if (role === "captain") return "/capitao";
  return "/me";
}
