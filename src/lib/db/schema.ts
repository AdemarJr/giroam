import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "admin",
  "organizer",
  "captain",
  "participant",
]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const organizerStatusEnum = pgEnum("organizer_status", [
  "pending",
  "approved",
  "blocked",
]);

export const eventKindEnum = pgEnum("event_kind", [
  "championship",
  "tournament",
  "race",
  "ride",
  "event",
]);

export const eventApprovalStatusEnum = pgEnum("event_approval_status", [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
]);

export const paymentModeEnum = pgEnum("payment_mode", [
  "free",
  "pix",
  "checkout",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "awaiting",
  "confirmed",
  "received",
  "overdue",
  "refunded",
  "cancelled",
  "failed",
]);

export const paymentBillingTypeEnum = pgEnum("payment_billing_type", [
  "UNDEFINED",
  "PIX",
  "CREDIT_CARD",
  "BOLETO",
]);

export const seasonStatusEnum = pgEnum("season_status", [
  "draft",
  "active",
  "closed",
]);

export const tournamentStatusEnum = pgEnum("tournament_status", [
  "draft",
  "registration_open",
  "registration_closed",
  "in_progress",
  "finished",
  "cancelled",
]);

export const registrationStatusEnum = pgEnum("registration_status", [
  "pending",
  "awaiting_payment",
  "approved",
  "rejected",
  "cancelled",
]);

export const teamStatusEnum = pgEnum("team_status", [
  "active",
  "inactive",
  "archived",
]);

export const stageStatusEnum = pgEnum("stage_status", [
  "scheduled",
  "open",
  "in_progress",
  "awaiting_results",
  "homologated",
  "cancelled",
]);

export const resultStatusEnum = pgEnum("result_status", [
  "finished",
  "dns",
  "dnf",
  "dsq",
  "absent",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 190 }).notNull(),
    cpf: varchar("cpf", { length: 11 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("participant"),
    photoUrl: text("photo_url"),
    phone: varchar("phone", { length: 30 }),
    birthDate: date("birth_date"),
    bibNumber: varchar("bib_number", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_cpf_uq").on(t.cpf),
  ],
);

export const seasons = pgTable("seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 160 }).notNull(),
  year: integer("year").notNull(),
  startsAt: date("starts_at").notNull(),
  endsAt: date("ends_at").notNull(),
  regulation: text("regulation"),
  status: seasonStatusEnum("status").notNull().default("draft"),
  championsPublished: boolean("champions_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const scoringTables = pgTable("scoring_tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  positions: jsonb("positions")
    .$type<Record<string, number>>()
    .notNull(),
  finisherPoints: integer("finisher_points").notNull().default(10),
  participationPoints: integer("participation_points").notNull().default(0),
  bonuses: jsonb("bonuses").$type<Record<string, number>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "restrict" }),
  organizerId: uuid("organizer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  scoringTableId: uuid("scoring_table_id")
    .notNull()
    .references(() => scoringTables.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 200 }).notNull(),
  kind: eventKindEnum("kind").notNull().default("tournament"),
  approvalStatus: eventApprovalStatusEnum("approval_status")
    .notNull()
    .default("approved"),
  bannerUrl: text("banner_url"),
  description: text("description"),
  regulation: text("regulation"),
  modality: varchar("modality", { length: 80 }).notNull().default("ciclismo"),
  location: varchar("location", { length: 240 }),
  routeInfo: text("route_info"),
  startsAt: date("starts_at").notNull(),
  endsAt: date("ends_at").notNull(),
  registrationStartsAt: timestamp("registration_starts_at", {
    withTimezone: true,
  }),
  registrationEndsAt: timestamp("registration_ends_at", {
    withTimezone: true,
  }),
  maxParticipants: integer("max_participants"),
  autoApproveRegistrations: boolean("auto_approve_registrations")
    .notNull()
    .default(true),
  allowTeams: boolean("allow_teams").notNull().default(true),
  maxScoringMembersPerStage: integer("max_scoring_members_per_stage"),
  paymentMode: paymentModeEnum("payment_mode").notNull().default("free"),
  priceCents: integer("price_cents").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  paymentDueDays: integer("payment_due_days").notNull().default(2),
  tieBreakers: jsonb("tie_breakers")
    .$type<string[]>()
    .notNull()
    .default([
      "wins",
      "seconds",
      "thirds",
      "best_recent_stage",
    ]),
  status: tournamentStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  crestUrl: text("crest_url"),
  color: varchar("color", { length: 20 }).notNull().default("#1B7A4E"),
  description: text("description"),
  captainId: uuid("captain_id").references(() => users.id, {
    onDelete: "set null",
  }),
  maxMembers: integer("max_members").notNull().default(10),
  status: teamStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("team_members_team_user_uq").on(t.teamId, t.userId)],
);

export const teamJoinRequests = pgTable("team_join_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  invitedBy: uuid("invited_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

/** Convites de conta (capitão → participante). Uso único + expiração. */
export const userInvites = pgTable(
  "user_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: varchar("token", { length: 64 }).notNull(),
    email: varchar("email", { length: 190 }),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    role: userRoleEnum("role").notNull().default("participant"),
    status: inviteStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedByUserId: uuid("used_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("user_invites_token_uq").on(t.token)],
);

export const organizerProfiles = pgTable("organizer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  status: organizerStatusEnum("status").notNull().default("pending"),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  document: varchar("document", { length: 18 }),
  phone: varchar("phone", { length: 30 }),
  bio: text("bio"),
  asaasCustomerId: varchar("asaas_customer_id", { length: 80 }),
  asaasWalletId: varchar("asaas_wallet_id", { length: 80 }),
  platformFeePercent: numeric("platform_fee_percent", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("0"),
  notes: text("notes"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const platformSettings = pgTable(
  "platform_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 80 }).notNull(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [uniqueIndex("platform_settings_key_uq").on(t.key)],
);

export const eventCategories = pgTable("event_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  gender: varchar("gender", { length: 20 }),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const registrationLots = pgTable("registration_lots", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  maxQuantity: integer("max_quantity"),
  soldCount: integer("sold_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => eventCategories.id, {
      onDelete: "set null",
    }),
    lotId: uuid("lot_id").references(() => registrationLots.id, {
      onDelete: "set null",
    }),
    amountCents: integer("amount_cents").notNull().default(0),
    status: registrationStatusEnum("status").notNull().default("pending"),
    bibNumber: varchar("bib_number", { length: 20 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("registrations_tournament_user_uq").on(t.tournamentId, t.userId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "restrict" }),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    gateway: varchar("gateway", { length: 40 }).notNull().default("asaas"),
    gatewayPaymentId: varchar("gateway_payment_id", { length: 80 }),
    gatewayCustomerId: varchar("gateway_customer_id", { length: 80 }),
    billingType: paymentBillingTypeEnum("billing_type")
      .notNull()
      .default("PIX"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    netAmountCents: integer("net_amount_cents"),
    feeCents: integer("fee_cents"),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    pixQrCode: text("pix_qr_code"),
    pixCopyPaste: text("pix_copy_paste"),
    pixEncodedImage: text("pix_encoded_image"),
    invoiceUrl: text("invoice_url"),
    dueDate: date("due_date"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    idempotencyKey: varchar("idempotency_key", { length: 80 }).notNull(),
    externalReference: varchar("external_reference", { length: 120 }).notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("payments_idempotency_uq").on(t.idempotencyKey),
    uniqueIndex("payments_gateway_payment_uq").on(t.gatewayPaymentId),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: uuid("payment_id").references(() => payments.id, {
      onDelete: "cascade",
    }),
    gatewayEventId: varchar("gateway_event_id", { length: 120 }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("payment_events_gateway_event_uq").on(t.gatewayEventId)],
);

export const stages = pgTable(
  "stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    number: integer("number").notNull(),
    eventDate: date("event_date").notNull(),
    eventTime: varchar("event_time", { length: 10 }),
    location: varchar("location", { length: 200 }),
    description: text("description"),
    distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),
    regulation: text("regulation"),
    status: stageStatusEnum("status").notNull().default("scheduled"),
    homologatedAt: timestamp("homologated_at", { withTimezone: true }),
    homologatedBy: uuid("homologated_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("stages_tournament_number_uq").on(t.tournamentId, t.number),
  ],
);

export const stageResults = pgTable(
  "stage_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    place: integer("place"),
    finishTime: varchar("finish_time", { length: 20 }),
    status: resultStatusEnum("status").notNull().default("finished"),
    isTie: boolean("is_tie").notNull().default(false),
    pointsPreliminary: integer("points_preliminary").notNull().default(0),
    pointsFinal: integer("points_final"),
    locked: boolean("locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("stage_results_stage_user_uq").on(t.stageId, t.userId),
  ],
);

export const pointLedger = pgTable(
  "point_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "restrict" }),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    stageResultId: uuid("stage_result_id")
      .notNull()
      .references(() => stageResults.id, { onDelete: "cascade" }),
    points: integer("points").notNull(),
    source: varchar("source", { length: 40 }).notNull().default("stage_finish"),
    isFinal: boolean("is_final").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("point_ledger_result_source_final_uq").on(
      t.stageResultId,
      t.source,
      t.isFinal,
    ),
  ],
);

export const resultAuditLogs = pgTable("result_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  stageResultId: uuid("stage_result_id")
    .notNull()
    .references(() => stageResults.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  field: varchar("field", { length: 60 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  justification: text("justification").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").references(() => seasons.id),
  tournamentId: uuid("tournament_id").references(() => tournaments.id),
  code: varchar("code", { length: 60 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  awardedAt: timestamp("awarded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const seasonsRelations = relations(seasons, ({ many }) => ({
  tournaments: many(tournaments),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  season: one(seasons, {
    fields: [tournaments.seasonId],
    references: [seasons.id],
  }),
  scoringTable: one(scoringTables, {
    fields: [tournaments.scoringTableId],
    references: [scoringTables.id],
  }),
  stages: many(stages),
  teams: many(teams),
  registrations: many(registrations),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [teams.tournamentId],
    references: [tournaments.id],
  }),
  captain: one(users, {
    fields: [teams.captainId],
    references: [users.id],
  }),
  members: many(teamMembers),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [stages.tournamentId],
    references: [tournaments.id],
  }),
  results: many(stageResults),
}));
