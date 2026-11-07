"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createSessionToken,
  hashPassword,
  requireUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const profileSchema = z.object({
  name: z.string().min(3).max(160),
  phone: z.string().max(30).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .optional()
    .or(z.literal("")),
});

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    photoUrl: formData.get("photoUrl") || "",
    birthDate: formData.get("birthDate") || "",
  });
  if (!parsed.success) return { error: "Dados inválidos" };

  const [updated] = await db
    .update(users)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      photoUrl: parsed.data.photoUrl || null,
      birthDate: parsed.data.birthDate || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  const token = await createSessionToken({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    cpf: updated.cpf,
    role: updated.role,
    photoUrl: updated.photoUrl,
  });
  await setSessionCookie(token);
  revalidatePath("/me");
  return { ok: true as const };
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) return { error: "Nova senha deve ter no mínimo 8 caracteres" };
  if (next !== confirm) return { error: "Confirmação de senha não confere" };

  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) return { error: "Usuário não encontrado" };

  const ok = await verifyPassword(current, row.passwordHash);
  if (!ok) return { error: "Senha atual incorreta" };

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(next),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/me");
  return { ok: true as const };
}
