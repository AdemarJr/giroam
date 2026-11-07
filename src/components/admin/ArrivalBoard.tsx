"use client";

import { useMemo, useState, useTransition } from "react";
import { saveArrivalBoardAction } from "@/lib/actions/championships";
import { Button, Input } from "@/components/ui/primitives";

export type ArrivalParticipant = {
  registrationId: string;
  userId: string;
  name: string;
  cpf: string;
  teamId: string | null;
  teamName: string | null;
  bibNumber: string | null;
};

type Draft = {
  place: number | null;
  finishTime: string;
  status: "finished" | "dns" | "dnf" | "dsq" | "absent";
  isTie: boolean;
};

export function ArrivalBoard({
  stageId,
  participants,
  initial,
}: {
  stageId: string;
  participants: ArrivalParticipant[];
  initial: Record<
    string,
    {
      place: number | null;
      finishTime: string | null;
      status: Draft["status"];
      isTie: boolean;
    }
  >;
}) {
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const map: Record<string, Draft> = {};
    for (const p of participants) {
      const prev = initial[p.userId];
      map[p.userId] = {
        place: prev?.place ?? null,
        finishTime: prev?.finishTime ?? "",
        status: prev?.status ?? "finished",
        isTie: prev?.isTie ?? false,
      };
    }
    return map;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.cpf.includes(q.replace(/\D/g, "")) ||
        (p.bibNumber ?? "").toLowerCase().includes(q) ||
        (p.teamName ?? "").toLowerCase().includes(q),
    );
  }, [participants, query]);

  function nextPlace() {
    const used = Object.values(drafts)
      .filter((d) => d.status === "finished" && d.place != null)
      .map((d) => d.place as number);
    let n = 1;
    while (used.includes(n)) n += 1;
    return n;
  }

  function assignNext(userId: string) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId]!,
        status: "finished",
        place: prev[userId]?.place ?? nextPlace(),
      },
    }));
  }

  function save() {
    startTransition(async () => {
      setMessage(null);
      const entries = participants.map((p) => ({
        registrationId: p.registrationId,
        userId: p.userId,
        teamId: p.teamId,
        place: drafts[p.userId]?.place ?? null,
        finishTime: drafts[p.userId]?.finishTime || null,
        status: drafts[p.userId]?.status ?? "absent",
        isTie: drafts[p.userId]?.isTie ?? false,
      }));

      const res = await saveArrivalBoardAction({ stageId, entries });
      if (res?.error) setMessage(res.error);
      else setMessage("Chegada salva e pontuação preliminar calculada.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, CPF, nº ou equipe"
          className="max-w-md"
        />
        <Button onClick={save} disabled={pending} variant="gold">
          {pending ? "Salvando…" : "Salvar ordem de chegada"}
        </Button>
      </div>

      {message && (
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-3 py-3">Atleta</th>
              <th className="px-3 py-3">Equipe</th>
              <th className="px-3 py-3">Nº</th>
              <th className="px-3 py-3">Colocação</th>
              <th className="px-3 py-3">Horário</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Empate</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const d = drafts[p.userId]!;
              return (
                <tr key={p.userId} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-xs text-white/40">{p.cpf}</div>
                  </td>
                  <td className="px-3 py-2 text-white/70">{p.teamName ?? "—"}</td>
                  <td className="px-3 py-2 text-white/70">{p.bibNumber ?? "—"}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5"
                      value={d.place ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [p.userId]: {
                            ...prev[p.userId]!,
                            place: e.target.value ? Number(e.target.value) : null,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      step={1}
                      className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5"
                      value={d.finishTime}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [p.userId]: {
                            ...prev[p.userId]!,
                            finishTime: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5"
                      value={d.status}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [p.userId]: {
                            ...prev[p.userId]!,
                            status: e.target.value as Draft["status"],
                            place:
                              e.target.value === "finished"
                                ? prev[p.userId]?.place ?? null
                                : null,
                          },
                        }))
                      }
                    >
                      <option value="finished">Concluiu</option>
                      <option value="dns">DNS</option>
                      <option value="dnf">DNF</option>
                      <option value="dsq">DSQ</option>
                      <option value="absent">Ausente</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={d.isTie}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [p.userId]: {
                            ...prev[p.userId]!,
                            isTie: e.target.checked,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => assignNext(p.userId)}
                    >
                      + ordem
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
