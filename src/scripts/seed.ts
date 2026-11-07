import { and, eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth/session";
import { ensureAgeCategoriesForTournament } from "../lib/categories/seed-categories";
import { getDb } from "../lib/db/client";
import {
  scoringTables,
  seasons,
  stages,
  tournaments,
  users,
} from "../lib/db/schema";
import { DEFAULT_SCORING_POSITIONS } from "../lib/scoring/engine";

async function main() {
  const db = getDb();
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@giroam.app").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "GiroAm@Admin123";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrador GiroAm";
  const cpf = (process.env.SEED_ADMIN_CPF ?? "00000000000").replace(/\D/g, "");

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!existing) {
    await db.insert(users).values({
      name,
      email,
      cpf,
      passwordHash: await hashPassword(password),
      role: "super_admin",
      birthDate: "1985-05-10",
    });
    console.log(`Super Admin criado: ${email}`);
  } else if (existing.role !== "super_admin") {
    await db
      .update(users)
      .set({ role: "super_admin" })
      .where(eq(users.id, existing.id));
    console.log(`Conta promovida a Super Admin: ${email}`);
  } else {
    console.log(`Super Admin já existe: ${email}`);
  }

  let [table] = await db.select().from(scoringTables).limit(1);
  if (!table) {
    const [created] = await db
      .insert(scoringTables)
      .values({
        name: "Padrão GiroAm",
        positions: DEFAULT_SCORING_POSITIONS,
        finisherPoints: 10,
        participationPoints: 0,
        bonuses: {},
      })
      .returning();
    table = created;
    console.log("Tabela de pontuação padrão criada");
  }

  const year = new Date().getFullYear();
  let [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, year))
    .limit(1);

  if (!season) {
    const [created] = await db
      .insert(seasons)
      .values({
        name: `Temporada ${year}`,
        year,
        startsAt: `${year}-01-01`,
        endsAt: `${year}-12-31`,
        regulation: "Regulamento geral da temporada GiroAm Pedal Challenge.",
        status: "active",
      })
      .returning();
    season = created;
    console.log(`Temporada ${year} criada`);
  }

  await seedDemoChampionship({
    db,
    seasonId: season.id,
    scoringTableId: table.id,
    name: `Campeonato de Ciclismo ${year}`,
    modality: "ciclismo",
    description:
      "Campeonato demo de ciclismo de estrada com categorias por idade (Infantil ao Master).",
    regulation:
      "Inscrição obrigatória na categoria etária correspondente à idade do atleta. Equipamento de segurança obrigatório.",
    stages: [
      { name: "Etapa 1 — Critério Urbano", number: 1, monthDay: "03-15" },
      { name: "Etapa 2 — Contra-relógio", number: 2, monthDay: "05-20" },
      { name: "Etapa 3 — Clássica do Interior", number: 3, monthDay: "08-10" },
      { name: "Etapa 4 — Grande Final", number: 4, monthDay: "11-08" },
    ],
  });

  await seedDemoChampionship({
    db,
    seasonId: season.id,
    scoringTableId: table.id,
    name: `Campeonato de Triatlo ${year}`,
    modality: "triathlon",
    description:
      "Campeonato demo de triatlo (natação, ciclismo e corrida) com categorias etárias Juvenil a Master.",
    regulation:
      "Categorias definidas por faixa etária no dia da prova. Capacete e boia de segurança obrigatórios nas etapas oficiais.",
    stages: [
      { name: "Etapa 1 — Sprint Lake", number: 1, monthDay: "04-12" },
      { name: "Etapa 2 — Olympic Distance", number: 2, monthDay: "07-05" },
      { name: "Etapa 3 — Final Aquática", number: 3, monthDay: "10-18" },
    ],
  });

  console.log("Seed concluído.");
  process.exit(0);
}

async function seedDemoChampionship(input: {
  db: ReturnType<typeof getDb>;
  seasonId: string;
  scoringTableId: string;
  name: string;
  modality: string;
  description: string;
  regulation: string;
  stages: { name: string; number: number; monthDay: string }[];
}) {
  const year = new Date().getFullYear();
  const [existing] = await input.db
    .select()
    .from(tournaments)
    .where(
      and(
        eq(tournaments.seasonId, input.seasonId),
        eq(tournaments.name, input.name),
      ),
    )
    .limit(1);

  let tournamentId = existing?.id;
  if (!existing) {
    const [created] = await input.db
      .insert(tournaments)
      .values({
        seasonId: input.seasonId,
        scoringTableId: input.scoringTableId,
        name: input.name,
        kind: "championship",
        modality: input.modality,
        approvalStatus: "approved",
        description: input.description,
        regulation: input.regulation,
        location: "Circuito GiroAm — Amazonas",
        routeInfo: "Percurso oficial publicado por etapa.",
        startsAt: `${year}-01-01`,
        endsAt: `${year}-12-31`,
        paymentMode: "free",
        priceCents: 0,
        maxParticipants: 500,
        autoApproveRegistrations: true,
        allowTeams: true,
        status: "registration_open",
        registrationStartsAt: new Date(),
      })
      .returning();
    tournamentId = created.id;
    console.log(`Campeonato demo criado: ${input.name}`);
  } else {
    console.log(`Campeonato demo já existe: ${input.name}`);
  }

  if (!tournamentId) return;

  const cats = await ensureAgeCategoriesForTournament(
    tournamentId,
    input.modality,
  );
  if (cats.created) {
    console.log(
      `  → ${cats.created} categorias etárias criadas (${input.modality})`,
    );
  }

  for (const stage of input.stages) {
    const [has] = await input.db
      .select()
      .from(stages)
      .where(
        and(
          eq(stages.tournamentId, tournamentId),
          eq(stages.number, stage.number),
        ),
      )
      .limit(1);
    if (has) continue;
    await input.db.insert(stages).values({
      tournamentId,
      name: stage.name,
      number: stage.number,
      eventDate: `${year}-${stage.monthDay}`,
      eventTime: "07:00",
      location: "Circuito GiroAm",
      status: "scheduled",
    });
    console.log(`  → Etapa ${stage.number}: ${stage.name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
