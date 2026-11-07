"use client";

import { cn } from "@/lib/utils";

type PodiumEntry = {
  position: number;
  name: string;
  points: number;
  subtitle?: string | null;
  photoUrl?: string | null;
};

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  const first = entries.find((e) => e.position === 1);
  const second = entries.find((e) => e.position === 2);
  const third = entries.find((e) => e.position === 3);

  const Slot = ({
    entry,
    height,
    tone,
  }: {
    entry?: PodiumEntry;
    height: string;
    tone: "gold" | "silver" | "bronze";
  }) => (
    <div className="flex flex-1 flex-col items-center">
      <div
        className={cn(
          "mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 bg-black/40 text-lg font-bold",
          tone === "gold" && "border-[var(--giro-gold)] text-[var(--giro-gold)] animate-[float_3s_ease-in-out_infinite]",
          tone === "silver" && "border-slate-300 text-slate-200",
          tone === "bronze" && "border-[var(--giro-bronze)] text-[var(--giro-bronze)]",
        )}
      >
        {entry?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          entry?.position ?? "—"
        )}
      </div>
      <div className="mb-2 text-center">
        <div className="text-sm font-semibold text-white">{entry?.name ?? "—"}</div>
        {entry?.subtitle && (
          <div className="text-xs text-white/50">{entry.subtitle}</div>
        )}
        <div
          className={cn(
            "mt-1 text-sm font-bold",
            tone === "gold" && "text-[var(--giro-gold)]",
            tone === "silver" && "text-slate-200",
            tone === "bronze" && "text-[var(--giro-bronze)]",
          )}
        >
          {entry ? `${entry.points} pts` : ""}
        </div>
      </div>
      <div
        className={cn(
          "w-full rounded-t-2xl border border-white/10",
          height,
          tone === "gold" && "bg-gradient-to-t from-[var(--giro-gold)]/40 to-[var(--giro-gold)]/10",
          tone === "silver" && "bg-gradient-to-t from-slate-400/30 to-slate-200/5",
          tone === "bronze" && "bg-gradient-to-t from-[var(--giro-bronze)]/35 to-[var(--giro-bronze)]/5",
        )}
      />
    </div>
  );

  return (
    <div className="flex items-end gap-3 pt-4">
      <Slot entry={second} height="h-24" tone="silver" />
      <Slot entry={first} height="h-36" tone="gold" />
      <Slot entry={third} height="h-20" tone="bronze" />
    </div>
  );
}
