import { redirect } from "next/navigation";
import {
  createOrganizerSeasonAction,
  listOrganizerDashboard,
} from "@/lib/actions/organizer";
import { isOrganizer } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  TextArea,
} from "@/components/ui/primitives";

export default async function OrganizadorTemporadasPage() {
  const user = await readSession();
  if (!user || !isOrganizer(user.role)) redirect("/organizador");
  const data = await listOrganizerDashboard();
  if (data.profile?.status !== "approved" && user.role !== "super_admin") {
    redirect("/organizador");
  }

  const year = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Temporadas / campeonatos"
        subtitle="Somente as temporadas vinculadas à sua conta."
      />

      <Card className="mb-8">
        <form action={createOrganizerSeasonAction} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input name="name" required placeholder={`Temporada ${year}`} />
          </div>
          <div>
            <Label>Ano</Label>
            <Input name="year" type="number" required defaultValue={year} />
          </div>
          <div />
          <div>
            <Label>Início</Label>
            <Input name="startsAt" type="date" required defaultValue={`${year}-01-01`} />
          </div>
          <div>
            <Label>Fim</Label>
            <Input name="endsAt" type="date" required defaultValue={`${year}-12-31`} />
          </div>
          <div className="sm:col-span-2">
            <Label>Regulamento</Label>
            <TextArea name="regulation" rows={4} />
          </div>
          <div>
            <Button type="submit">Criar temporada</Button>
          </div>
        </form>
      </Card>

      <Card>
        <ul className="space-y-2 text-sm">
          {data.seasons.map((s) => (
            <li key={s.id} className="rounded-xl border border-white/10 px-3 py-2">
              <strong className="text-white">{s.name}</strong>
              <span className="text-white/45">
                {" "}
                · {s.year} · {s.status}
              </span>
            </li>
          ))}
          {!data.seasons.length && (
            <li className="text-white/45">Nenhuma temporada criada.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
