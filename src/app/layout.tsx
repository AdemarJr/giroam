import type { Metadata } from "next";
import { Barlow_Condensed, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GiroAm · Pedal Challenge",
  description:
    "Campeonatos de ciclismo e triathlon da Amazônia — temporadas, etapas, equipes e rankings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full font-[family-name:var(--font-body)] antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-white/40">
          <p>GiroAm Pedal Challenge · Amazônia · Ciclismo & Triathlon</p>
          <p className="mt-2">
            Desenvolvido por Ademar Farias Jr —{" "}
            <a
              href="https://pyrou.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--giro-green)] hover:underline"
            >
              Pyrou.com.br
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
