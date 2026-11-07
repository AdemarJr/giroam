import Link from "next/link";
import { loginFormAction } from "@/lib/actions/forms";
import { isInviteOnlyRegistration } from "@/lib/config";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui/primitives";

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const inviteOnly = isInviteOnlyRegistration();
  const { error, next } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader title="Entrar" subtitle="Acesse com o e-mail da sua conta GiroAm." />
      <Card>
        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <form action={loginFormAction} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div>
            <Label>E-mail</Label>
            <Input name="email" type="email" required placeholder="voce@email.com" />
          </div>
          <div>
            <Label>Senha</Label>
            <Input name="password" type="password" required minLength={8} />
          </div>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-white/50">
          {inviteOnly ? (
            <>Cadastro somente com convite de um capitão.</>
          ) : (
            <>
              Não tem conta?{" "}
              <Link href="/cadastro" className="text-[var(--giro-green)]">
                Cadastre-se
              </Link>
            </>
          )}
        </p>
      </Card>
    </div>
  );
}
