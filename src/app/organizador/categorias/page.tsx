import { asc, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  createCategoryAction,
  listOrganizerDashboard,
} from "@/lib/actions/organizer";
import { isOrganizer } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";
import { formatAgeRange } from "@/lib/categories/age-presets";
import { db } from "@/lib/db/client";
import { eventCategories } from "@/lib/db/schema";
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Select,
  TextArea,
} from "@/components/ui/primitives";

export default async function OrganizadorCategoriasPage() {
  const user = await readSession();
  if (!user || !isOrganizer(user.role)) redirect("/organizador");
  const data = await listOrganizerDashboard();
  if (data.profile?.status !== "approved" && user.role !== "super_admin") {
    redirect("/organizador");
  }

  const tournamentIds = data.tournaments.map((t) => t.id);
  const cats = tournamentIds.length
    ? await db
        .select()
        .from(eventCategories)
        .where(inArray(eventCategories.tournamentId, tournamentIds))
        .orderBy(asc(eventCategories.sortOrder))
    : [];

  const nameByTournament = new Map(data.tournaments.map((t) => [t.id, t.name]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Categorias por idade"
        subtitle="Cada campeonato tem suas faixas etárias. Novos campeonatos já nascem com o pacote padrão da modalidade."
      />

      <Card className="mb-8">
        <form action={createCategoryAction} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Campeonato / evento</Label>
            <Select name="tournamentId" required>
              <option value="">Selecione</option>
              {data.tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.modality})
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Nome da categoria</Label>
            <Input name="name" required placeholder="Master B 40–49" />
          </div>
          <div>
            <Label>Idade mínima</Label>
            <Input name="minAge" type="number" min={0} required placeholder="40" />
          </div>
          <div>
            <Label>Idade máxima (vazio = sem teto)</Label>
            <Input name="maxAge" type="number" min={0} placeholder="49" />
          </div>
          <div>
            <Label>Gênero (opcional)</Label>
            <Select name="gender" defaultValue="">
              <option value="">Aberto</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </Select>
          </div>
          <div>
            <Label>Ordem</Label>
            <Input name="sortOrder" type="number" defaultValue={0} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <TextArea name="description" rows={2} />
          </div>
          <div>
            <Button type="submit">Adicionar categoria etária</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-white">
          Categorias cadastradas
        </h2>
        <ul className="space-y-2 text-sm">
          {cats.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-white/10 px-3 py-2"
            >
              <div className="font-medium text-white">{c.name}</div>
              <div className="text-white/45">
                {nameByTournament.get(c.tournamentId)} ·{" "}
                {formatAgeRange(c.minAge, c.maxAge)}
                {c.gender ? ` · ${c.gender}` : ""}
              </div>
            </li>
          ))}
          {!cats.length && (
            <li className="text-white/45">
              Nenhuma categoria ainda. Crie um campeonato para gerar o pacote
              etário automaticamente.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
