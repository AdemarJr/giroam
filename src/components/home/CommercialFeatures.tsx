import Link from "next/link";
import { Button, Card } from "@/components/ui/primitives";

const FEATURES = [
  {
    title: "Organização completa do campeonato",
    body: "Crie temporadas, torneios, corridas e etapas com regulamento, local, percurso e calendário — tudo em um único painel.",
  },
  {
    title: "Categorias por idade sob medida",
    body: "Cada campeonato nasce com faixas etárias da modalidade (ciclismo ou triatlo). O atleta se inscreve na categoria correta, validada automaticamente.",
  },
  {
    title: "Inscrições e pagamentos reais",
    body: "Inscrição gratuita ou paga com PIX e checkout via Asaas. Confirmação por webhook, sem depender de comprovante manual.",
  },
  {
    title: "Equipes, capitães e convites",
    body: "Capitães montam equipes, convidam atletas e acompanham resultados. Ideal para clubes, pelotões e assessorias.",
  },
  {
    title: "Chegada, homologação e rankings",
    body: "Registro de chegada, homologação de resultados, pontuação e rankings individuais e por equipe com transparência.",
  },
  {
    title: "Financeiro do organizador",
    body: "Acompanhe inscritos, pagamentos pendentes, bruto, taxas e líquido por evento — com isolamento entre organizadores.",
  },
] as const;

export function CommercialFeatures() {
  return (
    <section className="relative border-y border-white/5 bg-black/20">
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--giro-gold)]">
            Plataforma GiroAm
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-white md:text-5xl">
            Do anúncio à classificação final.
          </h2>
          <p className="mt-4 text-base text-white/65">
            O GiroAm Pedal Challenge é a plataforma comercial para organizar
            competições de ciclismo e triatlo: divulgar eventos, receber
            inscrições, operar a prova e entregar resultados com credibilidade.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-white/8 bg-[var(--giro-panel)]/70">
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{f.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/organizador">
            <Button variant="gold">Quero organizar um evento</Button>
          </Link>
          <Link href="/torneios">
            <Button variant="ghost">Ver competições abertas</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
