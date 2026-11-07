import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { reviewRegistrationAction } from "@/lib/actions/championships";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import { registrations, tournaments, users } from "@/lib/db/schema";
import { Badge, Button, Card, PageHeader } from "@/components/ui/primitives";
import { maskCpf } from "@/lib/utils";


export default async function InscricoesAdminPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  const rows = await db
    .select()
    .from(registrations)
    .orderBy(desc(registrations.createdAt))
    .limit(100);
  const people = await db.select().from(users);
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const tournamentRows = await db.select().from(tournaments);
  const tMap = new Map(tournamentRows.map((t) => [t.id, t.name]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="Inscrições"
        subtitle="Aprovação manual quando o torneio não usa auto-aprovação."
      />
      <Card>
        <ul className="space-y-3">
          {rows.map((r) => {
            const person = peopleMap.get(r.userId);
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-white">
                    {person?.name ?? "Atleta"}
                  </div>
                  <div className="text-xs text-white/45">
                    {tMap.get(r.tournamentId)} · CPF{" "}
                    {person ? maskCpf(person.cpf) : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{r.status}</Badge>
                  {r.status === "pending" && (
                    <>
                      <form
                        action={async () => {
                          "use server";
                          await reviewRegistrationAction(r.id, "approved");
                        }}
                      >
                        <Button type="submit">Aprovar</Button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await reviewRegistrationAction(r.id, "rejected");
                        }}
                      >
                        <Button type="submit" variant="danger">
                          Rejeitar
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {!rows.length && (
            <li className="text-sm text-white/45">Nenhuma inscrição.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
