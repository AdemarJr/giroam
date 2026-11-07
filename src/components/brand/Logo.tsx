export function GiroAmLogo({
  className = "",
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        className="h-10 w-10 shrink-0"
        aria-hidden
      >
        <defs>
          <linearGradient id="giroam-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3DDC84" />
            <stop offset="100%" stopColor="#0F6B3E" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="#0B1210" stroke="#1B7A4E" strokeWidth="2" />
        <circle cx="32" cy="32" r="14" fill="none" stroke="#D4AF37" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="3" fill="#D4AF37" />
        <path
          d="M18 40c6-14 14-22 28-26-8 10-10 20-8 30-8-2-14-2-20-4z"
          fill="url(#giroam-leaf)"
          opacity="0.95"
        />
        <path
          d="M22 22c8 2 16 8 20 16"
          fill="none"
          stroke="#F4F7F5"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {!markOnly && (
        <div className="leading-none">
          <div className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-white">
            Giro<span className="text-[var(--giro-green)]">Am</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/55">
            Pedal Challenge
          </div>
        </div>
      )}
    </div>
  );
}
