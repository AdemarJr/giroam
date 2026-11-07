import { redirect } from "next/navigation";
import {
  createLotAction,
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
} from "@/components/ui/primitives";

export default async function OrganizadorLotesPage() {
  const user = await readSession();
  if (!user || !isOrganizer(user.role)) redirect("/organizador");
  const data = await listOrganizerDashboard();
  if (data.profile?.status !== "approved" && user.role !== "super_admin") {
    redirect("/organizador");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Lotes promocionais"
        subtitle="Preços por período. Exige Asaas configurado."
      />
      {!data.asaasEnabled && (
        <Card className="mb-6 border-rose-500/30">
          <p className="text-sm text-rose-200">
            Configure `ASAAS_API_KEY` para criar lotes com cobrança real.
          </p>
        </Card>
      )}
      <Card>
        <form action={createLotAction} className="grid gap-3 sm:grid-cols-2">
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
            <Label>Nome do lote</Label>
            <Input name="name" required placeholder="1º lote" />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input name="priceReais" required defaultValue="50" />
          </div>
          <div>
            <Label>Início</Label>
            <Input name="startsAt" type="datetime-local" />
          </div>
          <div>
            <Label>Fim</Label>
            <Input name="endsAt" type="datetime-local" />
          </div>
          <div>
            <Label>Quantidade máx.</Label>
            <Input name="maxQuantity" type="number" min={1} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!data.asaasEnabled}>
              Criar lote
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
