import { Badge } from "@/components/ui/primitives";
import { formatPoints } from "@/lib/utils";

type IndividualRow = {
  position: number;
  name: string;
  photoUrl?: string | null;
  teamName?: string | null;
  teamColor?: string | null;
  points: number;
  stages: number;
  wins: number;
  podiums: number;
};

type TeamRow = {
  position: number;
  name: string;
  crestUrl?: string | null;
  color?: string | null;
  points: number;
  members: number;
  stages: number;
  stageWins: number;
};

export function IndividualRankingTable({ rows }: { rows: IndividualRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50">
          <tr>
            <th className="px-4 py-3">Pos</th>
            <th className="px-4 py-3">Atleta</th>
            <th className="px-4 py-3">Equipe</th>
            <th className="px-4 py-3">Pts</th>
            <th className="px-4 py-3">Etapas</th>
            <th className="px-4 py-3">Vitórias</th>
            <th className="px-4 py-3">Pódios</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.position}-${row.name}`}
              className="border-t border-white/5 hover:bg-white/[0.03]"
            >
              <td className="px-4 py-3">
                {row.position <= 3 ? (
                  <Badge
                    tone={
                      row.position === 1
                        ? "gold"
                        : row.position === 2
                          ? "silver"
                          : "bronze"
                    }
                  >
                    {row.position}º
                  </Badge>
                ) : (
                  <span className="text-white/70">{row.position}º</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs">
                    {row.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      row.name.slice(0, 1)
                    )}
                  </div>
                  <span className="font-medium text-white">{row.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-white/70">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: row.teamColor ?? "#666" }}
                  />
                  {row.teamName ?? "—"}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold text-[var(--giro-green)]">
                {formatPoints(row.points)}
              </td>
              <td className="px-4 py-3 text-white/70">{row.stages}</td>
              <td className="px-4 py-3 text-white/70">{row.wins}</td>
              <td className="px-4 py-3 text-white/70">{row.podiums}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-white/45">
                Nenhum ponto homologado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TeamRankingTable({ rows }: { rows: TeamRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50">
          <tr>
            <th className="px-4 py-3">Pos</th>
            <th className="px-4 py-3">Equipe</th>
            <th className="px-4 py-3">Pts</th>
            <th className="px-4 py-3">Integrantes</th>
            <th className="px-4 py-3">Etapas</th>
            <th className="px-4 py-3">Vitórias</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name + row.position}
              className="border-t border-white/5 hover:bg-white/[0.03]"
            >
              <td className="px-4 py-3">
                {row.position <= 3 ? (
                  <Badge
                    tone={
                      row.position === 1
                        ? "gold"
                        : row.position === 2
                          ? "silver"
                          : "bronze"
                    }
                  >
                    {row.position}º
                  </Badge>
                ) : (
                  row.position
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 text-xs font-bold"
                    style={{ background: `${row.color ?? "#1B7A4E"}33` }}
                  >
                    {row.crestUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.crestUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      row.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="font-medium text-white">{row.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-semibold text-[var(--giro-gold)]">
                {formatPoints(row.points)}
              </td>
              <td className="px-4 py-3 text-white/70">{row.members}</td>
              <td className="px-4 py-3 text-white/70">{row.stages}</td>
              <td className="px-4 py-3 text-white/70">{row.stageWins}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-white/45">
                Nenhum ponto coletivo ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
