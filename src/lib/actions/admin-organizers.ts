"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  organizerProfiles,
  payments,
  platformSettings,
  tournaments,
  users,
} from "@/lib/db/schema";

export async function listOrganizerApplications() {
  await requireAdmin();
  return db
    .select({
      profile: organizerProfiles,
      user: users,
    })
    .from(organizerProfiles)
    .innerJoin(users, eq(organizerProfiles.userId, users.id))
    .orderBy(desc(organizerProfiles.createdAt));
}

export async function reviewOrganizerAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "") as
    | "approved"
    | "blocked"
    | "pending";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const fee = String(formData.get("platformFeePercent") ?? "0");

  if (!userId || !["approved", "blocked", "pending"].includes(decision)) {
    throw new Error("Dados inválidos");
  }

  await db
    .update(organizerProfiles)
    .set({
      status: decision,
      notes,
      platformFeePercent: fee,
      approvedAt: decision === "approved" ? new Date() : null,
      approvedBy: decision === "approved" ? admin.id : null,
      updatedAt: new Date(),
    })
    .where(eq(organizerProfiles.userId, userId));

  if (decision === "approved") {
    await db
      .update(users)
      .set({ role: "organizer", updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  revalidatePath("/admin/organizadores");
}

export async function reviewEventAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const approvalStatus = String(formData.get("approvalStatus") ?? "") as
    | "approved"
    | "rejected"
    | "suspended"
    | "pending_review";

  await db
    .update(tournaments)
    .set({ approvalStatus, updatedAt: new Date() })
    .where(eq(tournaments.id, id));

  revalidatePath("/admin/organizadores");
  revalidatePath("/admin/torneios");
}

export async function listPlatformPayments() {
  await requireAdmin();
  return db
    .select({
      payment: payments,
      organizerName: users.name,
      tournamentName: tournaments.name,
    })
    .from(payments)
    .innerJoin(users, eq(payments.organizerId, users.id))
    .innerJoin(tournaments, eq(payments.tournamentId, tournaments.id))
    .orderBy(desc(payments.createdAt))
    .limit(400);
}

export async function setPlatformFeeAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const percent = Number(String(formData.get("percent") ?? "0").replace(",", "."));
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("Taxa inválida");
  }

  const [existing] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, "platform_fee_percent"))
    .limit(1);

  if (existing) {
    await db
      .update(platformSettings)
      .set({
        value: { percent },
        updatedAt: new Date(),
        updatedBy: admin.id,
      })
      .where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values({
      key: "platform_fee_percent",
      value: { percent },
      updatedBy: admin.id,
    });
  }

  revalidatePath("/admin/organizadores");
}
