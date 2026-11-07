import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { Button, Card, PageHeader } from "@/components/ui/primitives";

export default async function RelatoriosPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Relatórios"
        subtitle="Exportações CSV e Excel dos rankings e resultados."
      />
      <Card className="space-y-3">
        <Link href="/api/reports/ranking-individual?format=csv">
          <Button variant="ghost" className="w-full justify-start">
            Ranking individual (CSV)
          </Button>
        </Link>
        <Link href="/api/reports/ranking-individual?format=xlsx">
          <Button variant="ghost" className="w-full justify-start">
            Ranking individual (Excel)
          </Button>
        </Link>
        <Link href="/api/reports/ranking-equipes?format=csv">
          <Button variant="ghost" className="w-full justify-start">
            Ranking de equipes (CSV)
          </Button>
        </Link>
        <Link href="/api/reports/ranking-equipes?format=xlsx">
          <Button variant="ghost" className="w-full justify-start">
            Ranking de equipes (Excel)
          </Button>
        </Link>
      </Card>
    </div>
  );
}
