import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/roles";
import { createCaptainFormAction } from "@/lib/actions/forms";
import { listCaptains } from "@/lib/actions/invites";
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
} from "@/components/ui/primitives";

export default async function CapitaesAdminPage() {
  const user = await readSession();
  if (!user || !isSuperAdmin(user.role)) redirect("/admin");

  let captains: Awaited<ReturnType<typeof listCaptains>> = [];
  try {
    captains = await listCaptains();
  } catch {
    captains = [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Capitães"
        subtitle="Somente o Super Admin cria contas de capitão. Participantes entram só por convite deles."
      />

      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Novo capitão</h2>
        <form action={createCaptainFormAction} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input name="name" required minLength={3} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>CPF</Label>
            <Input name="cpf" required placeholder="000.000.000-00" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input name="phone" />
          </div>
          <div>
            <Label>Senha inicial</Label>
            <Input name="password" type="password" required minLength={8} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Criar capitão</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Capitães ativos</h2>
        <ul className="space-y-2">
          {captains.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-white/45">{c.email}</span>
              </span>
              <span className="text-white/40">
                {c.createdAt?.toLocaleDateString?.("pt-BR") ?? ""}
              </span>
            </li>
          ))}
          {!captains.length && (
            <li className="text-sm text-white/45">Nenhum capitão criado ainda.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
