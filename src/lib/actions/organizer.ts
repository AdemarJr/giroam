"use server";

import { and, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrganizer, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  eventCategories,
  organizerProfiles,
  payments,
  registrationLots,
  registrations,
  scoringTables,
  seasons,
  stages,
  tournaments,
  users,
} from "@/lib/db/schema";
import { isAsaasEnabled } from "@/lib/payments/asaas";
import {
  createRegistrationCharge,
  resolveRegistrationPriceCents,
} from "@/lib/payments/service";

async function assertApprovedOrganizer(userId: string, role: string) {
  if (role === "super_admin") return;
  const [profile] = await db
    .select()
    .from(organizerProfiles)
    .where(eq(organizerProfiles.userId, userId))
    .limit(1);
  if (!profile || profile.status !== "approved") {
    throw new Error("Organizador pendente de aprovação ou bloqueado");
  }
}

async function assertOwnsTournament(organizerId: string, tournamentId: string) {
  const [t] = await db
    .select()
    .from(tournaments)
    .where(
      and(
        eq(tournaments.id, tournamentId),
        eq(tournaments.organizerId, organizerId),
      ),
    )
    .limit(1);
  if (!t) throw new Error("Evento não encontrado ou sem permissão");
  return t;
}

export async function applyOrganizerAction(formData: FormData) {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const document = String(formData.get("document") ?? "").replace(/\D/g, "");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;

  if (displayName.length < 3) throw new Error("Informe o nome do organizador");

  const [existing] = await db
    .select()
    .from(organizerProfiles)
    .where(eq(organizerProfiles.userId, user.id))
    .limit(1);

  if (existing) {
    await db
      .update(organizerProfiles)
      .set({
        displayName,
        document: document || null,
        phone,
        bio,
        updatedAt: new Date(),
      })
      .where(eq(organizerProfiles.userId, user.id));
  } else {
    await db.insert(organizerProfiles).values({
      userId: user.id,
      displayName,
      document: document || null,
      phone,
      bio,
      status: "pending",
    });
    if (user.role === "participant" || user.role === "captain") {
      await db
        .update(users)
        .set({ role: "organizer", updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  }

  revalidatePath("/organizador");
  revalidatePath("/me");
}

export async function createOrganizerSeasonAction(formData: FormData) {
  const user = await requireOrganizer();
  await assertApprovedOrganizer(user.id, user.role);

  const name = String(formData.get("name") ?? "").trim();
  const year = Number(formData.get("year"));
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const regulation = String(formData.get("regulation") ?? "").trim() || null;

  if (!name || !year || !startsAt || !endsAt) {
    throw new Error("Preencha nome, ano e datas");
  }

  await db.insert(seasons).values({
    organizerId: user.id,
    name,
    year,
    startsAt,
    endsAt,
    regulation,
    status: "draft",
  });

  revalidatePath("/organizador");
  revalidatePath("/organizador/temporadas");
}

export async function createOrganizerEventAction(formData: FormData) {
  const user = await requireOrganizer();
  await assertApprovedOrganizer(user.id, user.role);

  const seasonId = String(formData.get("seasonId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "tournament") as
    | "championship"
    | "tournament"
    | "race"
    | "ride"
    | "event";
  const description = String(formData.get("description") ?? "").trim() || null;
  const regulation = String(formData.get("regulation") ?? "").trim() || null;
  const bannerUrl = String(formData.get("bannerUrl") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const routeInfo = String(formData.get("routeInfo") ?? "").trim() || null;
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const paymentMode = String(formData.get("paymentMode") ?? "free") as
    | "free"
    | "pix"
    | "checkout";
  const priceReais = Number(String(formData.get("priceReais") ?? "0").replace(",", "."));
  const maxParticipants = Number(formData.get("maxParticipants") || 0) || null;
  const allowTeams = String(formData.get("allowTeams") ?? "") === "on";

  if (!seasonId || !name || !startsAt || !endsAt) {
    throw new Error("Preencha temporada, nome e datas");
  }

  const [season] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.id, seasonId), eq(seasons.organizerId, user.id)))
    .limit(1);
  if (!season && user.role !== "super_admin") {
    throw new Error("Temporada inválida");
  }

  if (paymentMode !== "free" && !isAsaasEnabled()) {
    throw new Error(
      "Pagamentos pagos exigem ASAAS_API_KEY configurada no servidor",
    );
  }

  const [scoring] = await db.select().from(scoringTables).limit(1);
  if (!scoring) throw new Error("Tabela de pontuação padrão ausente — rode o seed");

  const priceCents = paymentMode === "free" ? 0 : Math.round(priceReais * 100);
  const modality = String(formData.get("modality") ?? "ciclismo").trim() || "ciclismo";

  const [created] = await db
    .insert(tournaments)
    .values({
      seasonId,
      organizerId: user.id,
      scoringTableId: scoring.id,
      name,
      kind,
      modality,
      approvalStatus: "pending_review",
      bannerUrl,
      description,
      regulation,
      location,
      routeInfo,
      startsAt,
      endsAt,
      maxParticipants,
      allowTeams,
      paymentMode,
      priceCents,
      status: "draft",
    })
    .returning();

  const { ensureAgeCategoriesForTournament } = await import(
    "@/lib/categories/seed-categories"
  );
  await ensureAgeCategoriesForTournament(created.id, modality);

  revalidatePath("/organizador");
  revalidatePath("/organizador/eventos");
  revalidatePath("/organizador/categorias");
}

export async function updateOrganizerEventAction(formData: FormData) {
  const user = await requireOrganizer();
  await assertApprovedOrganizer(user.id, user.role);
  const id = String(formData.get("id") ?? "");
  await assertOwnsTournament(user.id, id);

  const paymentMode = String(formData.get("paymentMode") ?? "free") as
    | "free"
    | "pix"
    | "checkout";
  if (paymentMode !== "free" && !isAsaasEnabled()) {
    throw new Error(
      "Pagamentos pagos exigem ASAAS_API_KEY configurada no servidor",
    );
  }

  const priceReais = Number(String(formData.get("priceReais") ?? "0").replace(",", "."));

  await db
    .update(tournaments)
    .set({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      regulation: String(formData.get("regulation") ?? "").trim() || null,
      bannerUrl: String(formData.get("bannerUrl") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      routeInfo: String(formData.get("routeInfo") ?? "").trim() || null,
      startsAt: String(formData.get("startsAt") ?? ""),
      endsAt: String(formData.get("endsAt") ?? ""),
      paymentMode,
      priceCents: paymentMode === "free" ? 0 : Math.round(priceReais * 100),
      maxParticipants: Number(formData.get("maxParticipants") || 0) || null,
      status: String(formData.get("status") ?? "draft") as
        | "draft"
        | "registration_open"
        | "registration_closed"
        | "in_progress"
        | "finished"
        | "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, id));

  revalidatePath("/organizador/eventos");
  revalidatePath(`/torneios/${id}`);
}

export async function createOrganizerStageAction(formData: FormData) {
  const user = await requireOrganizer();
  await assertApprovedOrganizer(user.id, user.role);
  const tournamentId = String(formData.get("tournamentId") ?? "");
  await assertOwnsTournament(user.id, tournamentId);

  const name = String(formData.get("name") ?? "").trim();
  const number = Number(formData.get("number"));
  const eventDate = String(formData.get("eventDate") ?? "");
  const eventTime = String(formData.get("eventTime") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const distanceKm = String(formData.get("distanceKm") ?? "").trim() || null;
  const regulation = String(formData.get("regulation") ?? "").trim() || null;

  if (!name || !number || !eventDate) throw new Error("Preencha etapa, número e data");

  await db.insert(stages).values({
    tournamentId,
    name,
    number,
    eventDate,
    eventTime,
    location,
    distanceKm,
    regulation,
  });

  revalidatePath("/organizador/etapas");
}

export async function createCategoryAction(formData: FormData) {
  const user = await requireOrganizer();
  await assertApprovedOrganizer(user.id, user.role);
  const tournamentId = String(formData.get("tournamentId") ?? "");
  await assertOwnsTournament(user.id, tournamentId);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome da categoria obrigatório");

  await db.insert(eventCategories).values({
    tournamentId,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    minAge: Number(formData.get("minAge") || 0) || null,
    maxAge: Number(formData.get("maxAge") || 0) || null,
    gender: String(formData.get("gender") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") || 0),
  });

  revalidatePath("/organizador/categorias");
}

export async function createLotAction(formData: FormData) {
  const user = await requireOrganizer();
  await assertApprovedOrganizer(user.id, user.role);
  const tournamentId = String(formData.get("tournamentId") ?? "");
  await assertOwnsTournament(user.id, tournamentId);

  if (!isAsaasEnabled()) {
    throw new Error("Lotes pagos exigem ASAAS_API_KEY configurada");
  }

  const name = String(formData.get("name") ?? "").trim();
  const priceReais = Number(String(formData.get("priceReais") ?? "0").replace(",", "."));
  if (!name || priceReais < 0) throw new Error("Lote inválido");

  await db.insert(registrationLots).values({
    tournamentId,
    name,
    priceCents: Math.round(priceReais * 100),
    startsAt: formData.get("startsAt")
      ? new Date(String(formData.get("startsAt")))
      : null,
    endsAt: formData.get("endsAt")
      ? new Date(String(formData.get("endsAt")))
      : null,
    maxQuantity: Number(formData.get("maxQuantity") || 0) || null,
  });

  revalidatePath("/organizador/lotes");
}

export async function listOrganizerDashboard() {
  const user = await requireOrganizer();
  const oid = user.id;

  const [profile] = await db
    .select()
    .from(organizerProfiles)
    .where(eq(organizerProfiles.userId, oid))
    .limit(1);

  const myTournaments = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.organizerId, oid))
    .orderBy(desc(tournaments.createdAt));

  const mySeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.organizerId, oid))
    .orderBy(desc(seasons.year));

  const tournamentIds = myTournaments.map((t) => t.id);

  let regsCount = 0;
  let paidCount = 0;
  let pendingPay = 0;
  let grossCents = 0;
  let netCents = 0;
  let feeCents = 0;

  if (tournamentIds.length) {
    const [r] = await db
      .select({ c: count() })
      .from(registrations)
      .where(inArray(registrations.tournamentId, tournamentIds));
    regsCount = Number(r?.c ?? 0);

    const payAgg = await db
      .select({
        status: payments.status,
        amount: sum(payments.amountCents),
        net: sum(payments.netAmountCents),
        fee: sum(payments.feeCents),
        c: count(),
      })
      .from(payments)
      .where(eq(payments.organizerId, oid))
      .groupBy(payments.status);

    for (const row of payAgg) {
      if (row.status === "confirmed" || row.status === "received") {
        paidCount += Number(row.c);
        grossCents += Number(row.amount ?? 0);
        netCents += Number(row.net ?? 0);
        feeCents += Number(row.fee ?? 0);
      }
      if (row.status === "pending" || row.status === "awaiting") {
        pendingPay += Number(row.c);
      }
    }
  }

  return {
    user,
    profile,
    seasons: mySeasons,
    tournaments: myTournaments,
    asaasEnabled: isAsaasEnabled(),
    finance: {
      registrations: regsCount,
      paid: paidCount,
      pending: pendingPay,
      grossCents,
      netCents,
      feeCents,
    },
  };
}

export async function listOrganizerRegistrations(tournamentId?: string) {
  const user = await requireOrganizer();
  const conds = [eq(tournaments.organizerId, user.id)];
  if (tournamentId) conds.push(eq(registrations.tournamentId, tournamentId));

  return db
    .select({
      registration: registrations,
      tournamentName: tournaments.name,
      userName: users.name,
      userEmail: users.email,
    })
    .from(registrations)
    .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
    .innerJoin(users, eq(registrations.userId, users.id))
    .where(and(...conds))
    .orderBy(desc(registrations.createdAt))
    .limit(200);
}

export async function listOrganizerPayments(filters?: {
  tournamentId?: string;
  status?: string;
}) {
  const user = await requireOrganizer();
  const conds = [eq(payments.organizerId, user.id)];
  if (filters?.tournamentId) {
    conds.push(eq(payments.tournamentId, filters.tournamentId));
  }
  if (filters?.status) {
    conds.push(
      eq(
        payments.status,
        filters.status as
          | "pending"
          | "awaiting"
          | "confirmed"
          | "received"
          | "overdue"
          | "refunded"
          | "cancelled"
          | "failed",
      ),
    );
  }

  return db
    .select({
      payment: payments,
      tournamentName: tournaments.name,
      userName: users.name,
    })
    .from(payments)
    .innerJoin(tournaments, eq(payments.tournamentId, tournaments.id))
    .innerJoin(users, eq(payments.userId, users.id))
    .where(and(...conds))
    .orderBy(desc(payments.createdAt))
    .limit(300);
}

/** Inscrição pública com cobrança (se evento pago). */
export async function enrollInEventAction(formData: FormData) {
  const user = await requireUser();
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const lotId = String(formData.get("lotId") ?? "") || null;
  const teamId = String(formData.get("teamId") ?? "") || null;

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament) throw new Error("Evento não encontrado");
  if (tournament.approvalStatus === "suspended") {
    throw new Error("Evento suspenso");
  }
  if (tournament.status !== "registration_open") {
    throw new Error("Inscrições não estão abertas");
  }

  const [dup] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.userId, user.id),
      ),
    )
    .limit(1);
  if (dup && dup.status !== "cancelled") {
    throw new Error("Você já possui inscrição neste evento");
  }

  const categories = await db
    .select()
    .from(eventCategories)
    .where(
      and(
        eq(eventCategories.tournamentId, tournamentId),
        eq(eventCategories.active, true),
      ),
    );

  if (categories.length > 0) {
    if (!categoryId) {
      throw new Error("Selecione a categoria etária do campeonato");
    }
    const category = categories.find((c) => c.id === categoryId);
    if (!category) throw new Error("Categoria inválida");

    const [fullUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!fullUser?.birthDate) {
      throw new Error(
        "Cadastre sua data de nascimento no perfil antes de se inscrever",
      );
    }

    const {
      ageFromBirthDate,
      categoryMatchesAge,
      formatAgeRange,
    } = await import("@/lib/categories/age-presets");
    const age = ageFromBirthDate(fullUser.birthDate);
    if (!categoryMatchesAge(age, category.minAge, category.maxAge)) {
      throw new Error(
        `Sua idade (${age} anos) não se enquadra em ${category.name} (${formatAgeRange(category.minAge, category.maxAge)})`,
      );
    }
  }

  if (tournament.maxParticipants) {
    const [c] = await db
      .select({ c: count() })
      .from(registrations)
      .where(
        and(
          eq(registrations.tournamentId, tournamentId),
          inArray(registrations.status, [
            "pending",
            "awaiting_payment",
            "approved",
          ]),
        ),
      );
    if (Number(c?.c ?? 0) >= tournament.maxParticipants) {
      throw new Error("Vagas esgotadas");
    }
  }

  const amountCents = await resolveRegistrationPriceCents({
    tournamentId,
    lotId,
  });

  if (amountCents > 0 && !isAsaasEnabled()) {
    throw new Error(
      "Pagamento indisponível: gateway Asaas não configurado no servidor",
    );
  }

  const status =
    amountCents > 0
      ? "awaiting_payment"
      : tournament.autoApproveRegistrations
        ? "approved"
        : "pending";

  let regId: string;
  if (dup?.status === "cancelled") {
    await db
      .update(registrations)
      .set({
        status,
        categoryId,
        lotId,
        teamId,
        amountCents,
        cancelledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(registrations.id, dup.id));
    regId = dup.id;
  } else {
    const [created] = await db
      .insert(registrations)
      .values({
        tournamentId,
        userId: user.id,
        categoryId,
        lotId,
        teamId,
        amountCents,
        status,
      })
      .returning();
    regId = created.id;
  }

  if (amountCents > 0) {
    const billingType =
      tournament.paymentMode === "checkout" ? "UNDEFINED" : "PIX";
    await createRegistrationCharge({ registrationId: regId, billingType });
  }

  revalidatePath(`/torneios/${tournamentId}`);
  revalidatePath("/me");
  return { registrationId: regId, needsPayment: amountCents > 0 };
}
