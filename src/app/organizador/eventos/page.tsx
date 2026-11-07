import { redirect } from "next/navigation";
import {
  createOrganizerEventAction,
  listOrganizerDashboard,
  updateOrganizerEventAction,
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

export default async function OrganizadorEventosPage() {
  const user = await readSession();
  if (!user || !isOrganizer(user.role)) redirect("/organizador");
  const data = await listOrganizerDashboard();
  if (data.profile?.status !== "approved" && user.role !== "super_admin") {
    redirect("/organizador");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Eventos"
        subtitle="Campeonatos, torneios, corridas, passeios e eventos."
      />

      <Card className="mb-8">
        <form action={createOrganizerEventAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Temporada</Label>
            <Select name="seasonId" required>
              <option value="">Selecione</option>
              {data.seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select name="kind" defaultValue="championship">
              <option value="championship">Campeonato</option>
              <option value="tournament">Torneio</option>
              <option value="race">Corrida / prova</option>
              <option value="ride">Passeio</option>
              <option value="event">Evento</option>
            </Select>
          </div>
          <div>
            <Label>Modalidade</Label>
            <Select name="modality" defaultValue="ciclismo">
              <option value="ciclismo">Ciclismo</option>
              <option value="mtb">MTB</option>
              <option value="triathlon">Triatlo</option>
              <option value="gravel">Gravel</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Início</Label>
            <Input name="startsAt" type="date" required />
          </div>
          <div>
            <Label>Fim</Label>
            <Input name="endsAt" type="date" required />
          </div>
          <div className="sm:col-span-2">
            <Label>Banner (URL da imagem)</Label>
            <Input name="bannerUrl" placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Local</Label>
            <Input name="location" />
          </div>
          <div className="sm:col-span-2">
            <Label>Percurso</Label>
            <TextArea name="routeInfo" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <TextArea name="description" rows={3} />
          </div>
          <div className="sm:col-span-2">
            <Label>Regulamento</Label>
            <TextArea name="regulation" rows={4} />
          </div>
          <div>
            <Label>Pagamento</Label>
            <Select name="paymentMode" defaultValue="free">
              <option value="free">Gratuito</option>
              <option value="pix">PIX (Asaas)</option>
              <option value="checkout">Checkout Asaas (PIX/cartão)</option>
            </Select>
          </div>
          <div>
            <Label>Valor base (R$)</Label>
            <Input name="priceReais" defaultValue="0" />
          </div>
          <div>
            <Label>Vagas</Label>
            <Input name="maxParticipants" type="number" min={0} />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" name="allowTeams" /> Permitir equipes
            </label>
          </div>
          <p className="sm:col-span-2 text-xs text-white/45">
            Ao criar, o campeonato recebe automaticamente as categorias por
            idade da modalidade (ex.: Infantil, Junior, Elite, Master…).
          </p>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!data.seasons.length}>
              Criar evento (vai para revisão admin)
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <ul className="space-y-3 text-sm">
          {data.tournaments.map((t) => (
            <li key={t.id} className="rounded-xl border border-white/10 px-3 py-3">
              <strong className="text-white">{t.name}</strong>
              <div className="mb-2 text-white/45">
                {t.kind} · {t.approvalStatus} · {t.status} · {t.paymentMode} ·{" "}
                {(t.priceCents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              <form action={updateOrganizerEventAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="name" value={t.name} />
                <input type="hidden" name="description" value={t.description ?? ""} />
                <input type="hidden" name="regulation" value={t.regulation ?? ""} />
                <input type="hidden" name="bannerUrl" value={t.bannerUrl ?? ""} />
                <input type="hidden" name="location" value={t.location ?? ""} />
                <input type="hidden" name="routeInfo" value={t.routeInfo ?? ""} />
                <input type="hidden" name="startsAt" value={t.startsAt} />
                <input type="hidden" name="endsAt" value={t.endsAt} />
                <input type="hidden" name="paymentMode" value={t.paymentMode} />
                <input
                  type="hidden"
                  name="priceReais"
                  value={(t.priceCents / 100).toFixed(2)}
                />
                <input
                  type="hidden"
                  name="maxParticipants"
                  value={t.maxParticipants ?? ""}
                />
                <Select name="status" defaultValue={t.status}>
                  <option value="draft">draft</option>
                  <option value="registration_open">registration_open</option>
                  <option value="registration_closed">registration_closed</option>
                  <option value="in_progress">in_progress</option>
                  <option value="finished">finished</option>
                  <option value="cancelled">cancelled</option>
                </Select>
                <Button type="submit" variant="ghost">
                  Atualizar status
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
