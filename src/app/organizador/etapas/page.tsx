import { redirect } from "next/navigation";
import {
  createOrganizerStageAction,
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
  Select,
  TextArea,
} from "@/components/ui/primitives";

export default async function OrganizadorEtapasPage() {
  const user = await readSession();
  if (!user || !isOrganizer(user.role)) redirect("/organizador");
  const data = await listOrganizerDashboard();
  if (data.profile?.status !== "approved" && user.role !== "super_admin") {
    redirect("/organizador");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Etapas" subtitle="Cadastre etapas dos seus eventos." />
      <Card>
        <form action={createOrganizerStageAction} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Evento</Label>
            <Select name="tournamentId" required>
              <option value="">Selecione</option>
              {data.tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Número</Label>
            <Input name="number" type="number" required min={1} defaultValue={1} />
          </div>
          <div>
            <Label>Data</Label>
            <Input name="eventDate" type="date" required />
          </div>
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Horário</Label>
            <Input name="eventTime" placeholder="08:00" />
          </div>
          <div>
            <Label>Distância (km)</Label>
            <Input name="distanceKm" />
          </div>
          <div className="sm:col-span-2">
            <Label>Local</Label>
            <Input name="location" />
          </div>
          <div className="sm:col-span-2">
            <Label>Regulamento da etapa</Label>
            <TextArea name="regulation" rows={3} />
          </div>
          <div>
            <Button type="submit">Salvar etapa</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
