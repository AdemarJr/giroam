import Link from "next/link";
import { registerFormAction } from "@/lib/actions/forms";
import { getInviteByToken } from "@/lib/actions/invites";
import { isInviteOnlyRegistration } from "@/lib/config";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui/primitives";

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function CadastroPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  const inviteOnly = isInviteOnlyRegistration();
  const invite = token ? await getInviteByToken(token) : null;

  const inviteValid =
    invite &&
    invite.status === "pending" &&
    (!invite.expiresAt || invite.expiresAt.getTime() > Date.now());

  if (inviteOnly && !inviteValid) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <PageHeader
          title="Cadastro por convite"
          subtitle="Só é possível entrar com um link enviado por um capitão."
        />
        <Card>
          {error && (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <p className="text-sm text-white/60">
            {token
              ? "Este convite é inválido, expirado ou já foi usado."
              : "Peça o link de convite ao seu capitão e abra-o para criar a conta."}
          </p>
          <p className="mt-4 text-center text-sm text-white/50">
            Já tem conta?{" "}
            <Link href="/login" className="text-[var(--giro-green)]">
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader
        title="Cadastro"
        subtitle={
          inviteValid
            ? "Convite válido — complete seus dados para entrar."
            : "CPF é validado e vinculado à conta — necessário para inscrição."
        }
      />
      <Card>
        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <form action={registerFormAction} className="space-y-4">
          {token && <input type="hidden" name="inviteToken" value={token} />}
          <div>
            <Label>Nome completo</Label>
            <Input name="name" required minLength={3} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input
              name="email"
              type="email"
              required
              defaultValue={invite?.email ?? undefined}
              readOnly={Boolean(invite?.email)}
            />
          </div>
          <div>
            <Label>CPF</Label>
            <Input name="cpf" required placeholder="000.000.000-00" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input name="phone" placeholder="(92) 90000-0000" />
          </div>
          <div>
            <Label>Senha</Label>
            <Input name="password" type="password" required minLength={8} />
          </div>
          <Button type="submit" className="w-full">
            Criar conta
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-white/50">
          Já tem conta?{" "}
          <Link href="/login" className="text-[var(--giro-green)]">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
