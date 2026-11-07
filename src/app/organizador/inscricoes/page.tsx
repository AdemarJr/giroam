import { redirect } from "next/navigation";
import { listOrganizerRegistrations } from "@/lib/actions/organizer";
import { isOrganizer } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";

export default async function OrganizadorInscricoesPage() {
  const user = await readSession();
  if (!user || !isOrganizer(user.role)) redirect("/organizador");
  const rows = await listOrganizerRegistrations();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="Inscrições"
        subtitle="Participantes dos seus eventos (isolamento por organizador)."
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-white/45">
              <tr>
                <th className="py-2">Evento</th>
                <th>Participante</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.registration.id} className="border-t border-white/10">
                  <td className="py-2 text-white">{r.tournamentName}</td>
                  <td>
                    <div className="text-white">{r.userName}</div>
                    <div className="text-xs text-white/45">{r.userEmail}</div>
                  </td>
                  <td>
                    <Badge>{r.registration.status}</Badge>
                  </td>
                  <td className="text-white/80">
                    {(r.registration.amountCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-white/45">
                    Nenhuma inscrição.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
