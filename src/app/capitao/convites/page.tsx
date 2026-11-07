import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { isCaptain, isAdminRole } from "@/lib/auth/roles";
import {
  createAthleteByCaptainFormAction,
  createParticipantInviteFormAction,
  revokeInviteFormAction,
} from "@/lib/actions/forms";
import { listCaptainTeams, listMyInvites } from "@/lib/actions/invites";
import { inviteExpiryDays } from "@/lib/config";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Select,
} from "@/components/ui/primitives";

export default async function CapitaoConvitesPage() {
  const user = await readSession();
  if (!user) redirect("/login");
  if (!isCaptain(user.role) && !isAdminRole(user.role)) redirect("/me");

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const expiryDays = inviteExpiryDays();

  let invites: Awaited<ReturnType<typeof listMyInvites>> = [];
  let captainTeams: Awaited<ReturnType<typeof listCaptainTeams>> = [];
  try {
    invites = await listMyInvites();
    captainTeams = await listCaptainTeams();
  } catch {
    invites = [];
    captainTeams = [];
  }

  const teamName = new Map(captainTeams.map((t) => [t.id, t.name]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Atletas"
        subtitle={`Cadastre direto ou envie um link de uso único (expira em ${expiryDays} dias; após o cadastro o link não serve mais).`}
      />

      {!captainTeams.length && (
        <Card className="mb-6">
          <p className="text-sm text-white/60">
            Você ainda não tem equipe. Peça ao admin para criar a equipe com a
            sua conta de capitão.
          </p>
        </Card>
      )}

      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Cadastrar atleta agora</h2>
        <form action={createAthleteByCaptainFormAction} className="space-y-3">
          <div>
            <Label>Equipe</Label>
            <Select name="teamId" required disabled={!captainTeams.length}>
              <option value="">Selecione…</option>
              {captainTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Nome</Label>
            <Input name="name" required minLength={3} />
          </div>
          <div>
            <Label>E-mail (login)</Label>
            <Input name="email" type="email" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF</Label>
              <Input name="cpf" required placeholder="000.000.000-00" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input name="phone" />
            </div>
          </div>
          <div>
            <Label>Senha inicial</Label>
            <Input name="password" type="password" required minLength={8} />
          </div>
          <Button type="submit" disabled={!captainTeams.length}>
            Criar atleta na equipe
          </Button>
        </form>
      </Card>

      <Card className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Gerar link temporário</h2>
        <p className="mb-4 text-xs text-white/45">
          Uso único: depois que o atleta se cadastrar, o link fica inválido.
        </p>
        <form action={createParticipantInviteFormAction} className="space-y-4">
          <div>
            <Label>Equipe</Label>
            <Select name="teamId" required disabled={!captainTeams.length}>
              <option value="">Selecione…</option>
              {captainTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>E-mail do convidado (opcional)</Label>
            <Input
              name="email"
              type="email"
              placeholder="Se preenchido, só esse e-mail pode usar o link"
            />
          </div>
          <div>
            <Label>Observação</Label>
            <Input name="note" placeholder="Ex.: Atleta reserva" />
          </div>
          <Button type="submit" disabled={!captainTeams.length}>
            Gerar link de uso único
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Links gerados</h2>
        <ul className="space-y-3">
          {invites.map((inv) => {
            const link = `${appUrl}/cadastro?token=${inv.token}`;
            const used = inv.status !== "pending";
            return (
              <li
                key={inv.id}
                className="rounded-xl border border-white/10 px-3 py-3 text-sm"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone={inv.status === "pending" ? "green" : "muted"}>
                    {inv.status === "pending"
                      ? "ativo"
                      : inv.status === "accepted"
                        ? "já usado"
                        : inv.status}
                  </Badge>
                  {inv.teamId && (
                    <span className="text-white/50">
                      {teamName.get(inv.teamId) ?? "Equipe"}
                    </span>
                  )}
                  {inv.email && (
                    <span className="text-white/60">{inv.email}</span>
                  )}
                  {inv.expiresAt && (
                    <span className="text-white/35">
                      expira {inv.expiresAt.toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                {!used && (
                  <>
                    <code className="mb-2 block break-all rounded-lg bg-black/30 px-2 py-1 text-xs text-[var(--giro-green)]">
                      {link}
                    </code>
                    <form action={revokeInviteFormAction}>
                      <input type="hidden" name="inviteId" value={inv.id} />
                      <Button type="submit" variant="ghost">
                        Revogar link
                      </Button>
                    </form>
                  </>
                )}
                {used && (
                  <p className="text-xs text-white/40">
                    Link encerrado — não pode ser reutilizado.
                  </p>
                )}
              </li>
            );
          })}
          {!invites.length && (
            <li className="text-sm text-white/45">Nenhum link ainda.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
