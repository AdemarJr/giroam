import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { eventCategories } from "@/lib/db/schema";
import { ageCategoryPresetsForModality } from "@/lib/categories/age-presets";

/** Cria categorias etárias do campeonato se ainda não existirem. */
export async function ensureAgeCategoriesForTournament(
  tournamentId: string,
  modality: string,
) {
  const existing = await db
    .select({ id: eventCategories.id })
    .from(eventCategories)
    .where(eq(eventCategories.tournamentId, tournamentId))
    .limit(1);

  if (existing.length) return { created: 0 };

  const presets = ageCategoryPresetsForModality(modality);
  await db.insert(eventCategories).values(
    presets.map((p) => ({
      tournamentId,
      name: p.name,
      description: p.description,
      minAge: p.minAge,
      maxAge: p.maxAge,
      gender: p.gender,
      sortOrder: p.sortOrder,
      active: true,
    })),
  );

  return { created: presets.length };
}
