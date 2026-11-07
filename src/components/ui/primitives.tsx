import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[var(--giro-panel)]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "gold" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--giro-green)] disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--giro-green)] text-[#04140c] hover:brightness-110",
        variant === "ghost" &&
          "border border-white/15 bg-white/5 text-white hover:bg-white/10",
        variant === "gold" &&
          "bg-[var(--giro-gold)] text-[#1a1405] hover:brightness-110",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-500",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[var(--giro-green)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[var(--giro-green)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/55">
      {children}
    </label>
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-[var(--giro-green)] focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "gold" | "silver" | "bronze" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tone === "green" && "bg-[var(--giro-green)]/20 text-[var(--giro-green)]",
        tone === "gold" && "bg-[var(--giro-gold)]/20 text-[var(--giro-gold)]",
        tone === "silver" && "bg-slate-300/20 text-slate-200",
        tone === "bronze" && "bg-[var(--giro-bronze)]/20 text-[var(--giro-bronze)]",
        tone === "muted" && "bg-white/10 text-white/70",
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-white md:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-white/60">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
