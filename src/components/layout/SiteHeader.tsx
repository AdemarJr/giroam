import Link from "next/link";
import { GiroAmLogo } from "@/components/brand/Logo";
import { logoutAction } from "@/lib/actions/auth";
import { isAdminRole, isCaptain } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";
import { isInviteOnlyRegistration } from "@/lib/config";
import { Button } from "@/components/ui/primitives";

export async function SiteHeader() {
  const user = await readSession();
  const showPublicSignup = !isInviteOnlyRegistration();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1210]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <GiroAmLogo />
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-white/70 md:flex">
          <Link href="/torneios" className="hover:text-white">
            Torneios
          </Link>
          <Link href="/rankings" className="hover:text-white">
            Rankings
          </Link>
          <Link href="/premiacao" className="hover:text-white">
            Premiação
          </Link>
          {user && (
            <Link href="/me" className="hover:text-white">
              Meu painel
            </Link>
          )}
          {user && isCaptain(user.role) && (
            <Link href="/capitao" className="hover:text-white">
              Capitão
            </Link>
          )}
          {user && isAdminRole(user.role) && (
            <Link href="/admin" className="text-[var(--giro-green)] hover:text-white">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-xs text-white/50 sm:inline">
                {user.name.split(" ")[0]}
              </span>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost">
                  Sair
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              {showPublicSignup && (
                <Link href="/cadastro">
                  <Button>Cadastrar</Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
