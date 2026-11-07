"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/primitives";

export type CarouselEvent = {
  id: string;
  name: string;
  description: string | null;
  modality: string;
  kind: string;
  status: string;
  bannerUrl: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  paymentMode: string;
  priceCents: number;
};

const FALLBACK_BY_MODALITY: Record<string, string> = {
  ciclismo:
    "https://images.unsplash.com/photo-1517649763962-0c623066027e?auto=format&fit=crop&w=1920&q=80",
  mtb: "https://images.unsplash.com/photo-1576435728678-68d0fbf378e9?auto=format&fit=crop&w=1920&q=80",
  triathlon:
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1920&q=80",
  gravel:
    "https://images.unsplash.com/photo-1485965120187-cfbe3f0c0c0f?auto=format&fit=crop&w=1920&q=80",
};

function kindLabel(kind: string) {
  switch (kind) {
    case "championship":
      return "Campeonato";
    case "race":
      return "Corrida";
    case "ride":
      return "Passeio";
    case "event":
      return "Evento";
    default:
      return "Torneio";
  }
}

function priceLabel(event: CarouselEvent) {
  if (event.paymentMode === "free" || event.priceCents <= 0) return "Inscrição gratuita";
  return (event.priceCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function bannerFor(event: CarouselEvent) {
  if (event.bannerUrl) return event.bannerUrl;
  const key = event.modality.toLowerCase();
  return (
    FALLBACK_BY_MODALITY[key] ||
    FALLBACK_BY_MODALITY.ciclismo
  );
}

export function EventBannerCarousel({ events }: { events: CarouselEvent[] }) {
  const slides = events.length
    ? events
    : ([
        {
          id: "placeholder",
          name: "Próximas competições GiroAm",
          description:
            "Campeonatos, torneios e corridas com inscrição, categorias etárias e resultados em tempo real.",
          modality: "ciclismo",
          kind: "championship",
          status: "registration_open",
          bannerUrl: FALLBACK_BY_MODALITY.ciclismo,
          location: "Amazônia",
          startsAt: "",
          endsAt: "",
          paymentMode: "free",
          priceCents: 0,
        },
      ] satisfies CarouselEvent[]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, [slides.length, paused]);

  const current = slides[index]!;
  const href =
    current.id === "placeholder" ? "/torneios" : `/torneios/${current.id}`;

  return (
    <section
      className="relative isolate min-h-[78vh] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Destaques de corridas, torneios e campeonatos"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerFor(slide)}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06100c]/95 via-[#06100c]/70 to-[#06100c]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1210] via-transparent to-[#0b1210]/40" />
        </div>
      ))}

      <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 md:justify-center md:pb-20">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-[0.18em] text-[var(--giro-green)] md:text-3xl">
          GIROAM
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
          {kindLabel(current.kind)} · {current.modality}
        </p>
        <h2 className="mt-2 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-[0.95] tracking-wide text-white md:text-6xl lg:text-7xl">
          {current.name}
        </h2>
        <p className="mt-4 max-w-xl text-sm text-white/70 md:text-base">
          {current.description ||
            "Confira regulamento, categorias por idade, etapas e faça sua inscrição."}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-wide text-white/45">
          {current.location && <span>{current.location}</span>}
          {current.startsAt && (
            <span>
              {current.startsAt}
              {current.endsAt ? ` → ${current.endsAt}` : ""}
            </span>
          )}
          <span>{priceLabel(current)}</span>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={href}>
            <Button>Ver evento</Button>
          </Link>
          <Link href="/torneios">
            <Button variant="ghost">Todos os torneios</Button>
          </Link>
        </div>

        {slides.length > 1 && (
          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() =>
                setIndex((i) => (i - 1 + slides.length) % slides.length)
              }
              aria-label="Anterior"
            >
              ←
            </button>
            <div className="flex gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Ir para ${slide.name}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? "w-8 bg-[var(--giro-green)]"
                      : "w-3 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              aria-label="Próximo"
            >
              →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
