import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth/session";
import { getDb } from "../lib/db/client";
import {
  scoringTables,
  seasons,
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

  const [table] = await db.select().from(scoringTables).limit(1);
  if (!table) {
    await db.insert(scoringTables).values({
      name: "Padrão GiroAm",
      positions: DEFAULT_SCORING_POSITIONS,
      finisherPoints: 10,
      participationPoints: 0,
      bonuses: {},
    });
    console.log("Tabela de pontuação padrão criada");
  }

  const year = new Date().getFullYear();
  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, year))
    .limit(1);

  if (!season) {
    await db.insert(seasons).values({
      name: `Temporada ${year}`,
      year,
      startsAt: `${year}-01-01`,
      endsAt: `${year}-12-31`,
      regulation: "Regulamento geral da temporada GiroAm Pedal Challenge.",
      status: "active",
    });
    console.log(`Temporada ${year} criada`);
  }

  console.log("Seed concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
