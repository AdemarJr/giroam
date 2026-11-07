import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ArrivalBoard } from "@/components/admin/ArrivalBoard";
import { PageHeader } from "@/components/ui/primitives";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import {
  registrations,
  stageResults,
  stages,
  teams,
  users,
} from "@/lib/db/schema";
import { maskCpf } from "@/lib/utils";


export default async function ChegadaStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  const { stageId } = await params;
  const [stage] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
  if (!stage) notFound();

  const regs = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, stage.tournamentId),
        eq(registrations.status, "approved"),
      ),
    );

  const people = await db.select().from(users);
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const teamRows = await db.select().from(teams);
  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  const existing = await db
    .select()
    .from(stageResults)
    .where(eq(stageResults.stageId, stageId));
  const initial: Record<
    string,
    {
      place: number | null;
      finishTime: string | null;
      status: "finished" | "dns" | "dnf" | "dsq" | "absent";
      isTie: boolean;
    }
  > = {};
  for (const r of existing) {
    initial[r.userId] = {
      place: r.place,
      finishTime: r.finishTime,
      status: r.status,
      isTie: r.isTie,
    };
  }

  const participants = regs.map((r) => {
    const person = peopleMap.get(r.userId);
    const team = r.teamId ? teamMap.get(r.teamId) : null;
    return {
      registrationId: r.id,
      userId: r.userId,
      name: person?.name ?? "Atleta",
      cpf: person ? maskCpf(person.cpf) : "—",
      teamId: r.teamId,
      teamName: team?.name ?? null,
      bibNumber: r.bibNumber ?? person?.bibNumber ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title={`Chegada · ${stage.name}`}
        subtitle="Registre na ordem da linha de chegada. DNS/DNF/DSQ/Ausente = 0 ponto."
      />
      <ArrivalBoard
        stageId={stage.id}
        participants={participants}
        initial={initial}
      />
    </div>
  );
}
