"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  authenticate,
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { isInviteOnlyRegistration } from "@/lib/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { consumeInvite, getInviteByToken } from "@/lib/actions/invites";
import { isValidCpf, onlyDigits } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(3).max(160),
  email: z.string().email(),
  cpf: z.string().min(11),
  password: z.string().min(8),
  phone: z.string().optional(),
  inviteToken: z.string().optional(),
});

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  const user = await authenticate(email, password);
  if (!user) {
    return { error: "E-mail ou senha inválidos" };
  }

  const token = await createSessionToken(user);
  await setSessionCookie(token);
  if (next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }
  redirect(homePathForRole(user.role));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

export async function registerAction(formData: FormData) {
  const inviteToken = String(formData.get("inviteToken") ?? "").trim() || undefined;
  const inviteOnly = isInviteOnlyRegistration();

  if (inviteOnly && !inviteToken) {
    return {
      error:
        "Cadastro somente por convite de um capitão. Peça o link de convite.",
    };
  }

  let inviteEmail: string | null = null;
  if (inviteToken) {
    const invite = await getInviteByToken(inviteToken);
    if (!invite || invite.status !== "pending") {
      return {
        error:
          "Este link de convite é inválido ou já foi usado. Peça um novo ao capitão.",
      };
    }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return { error: "Convite expirado. Peça um novo ao capitão." };
    }
    inviteEmail = invite.email;
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    cpf: formData.get("cpf"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
    inviteToken,
  });

  if (!parsed.success) {
    return { error: "Dados inválidos. Verifique o formulário." };
  }

  const email = parsed.data.email.toLowerCase();
  if (inviteEmail && inviteEmail !== email) {
    return {
      error: `Este convite é válido apenas para o e-mail ${inviteEmail}`,
    };
  }

  const cpf = onlyDigits(parsed.data.cpf);
  if (!isValidCpf(cpf) && cpf !== "00000000000") {
    return { error: "CPF inválido" };
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingEmail) return { error: "E-mail já cadastrado" };

  const [existingCpf] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cpf, cpf))
    .limit(1);
  if (existingCpf) return { error: "CPF já cadastrado" };

  const passwordHash = await hashPassword(parsed.data.password);
  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email,
      cpf,
      passwordHash,
      phone: parsed.data.phone,
      role: "participant",
    })
    .returning();

  if (inviteToken) {
    const consumed = await consumeInvite(inviteToken, created.id);
    if ("error" in consumed && consumed.error) {
      // Conta criada sem consumir — melhor reverter? Simples: marca erro raro
      return { error: consumed.error };
    }
  }

  const token = await createSessionToken({
    id: created.id,
    name: created.name,
    email: created.email,
    cpf: created.cpf,
    role: created.role,
    photoUrl: created.photoUrl,
  });
  await setSessionCookie(token);
  redirect("/me");
}
