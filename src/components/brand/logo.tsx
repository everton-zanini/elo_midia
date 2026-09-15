import { cn } from "@/lib/utils";

/**
 * Símbolo da marca: dois elos entrelaçados (referência literal a "elo" =
 * elemento de corrente), em roxo e coral. Desenhado em SVG puro, sem
 * dependências externas.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="4"
        y="12"
        width="22"
        height="14"
        rx="7"
        fill="none"
        stroke="#5B3FA6"
        strokeWidth="4.5"
      />
      <rect
        x="14"
        y="14"
        width="22"
        height="14"
        rx="7"
        fill="none"
        stroke="#F27866"
        strokeWidth="4.5"
      />
    </svg>
  );
}

export function Logo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={iconClassName} />
      <span className="font-heading text-lg font-bold tracking-tight">Elo Mídia</span>
    </span>
  );
}
