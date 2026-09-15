import Link from "next/link";
import { Plus } from "lucide-react";
import { STAGE_LABELS } from "@/lib/workflow";
import { cn } from "@/lib/utils";
import type { AgendaItem } from "@/server/data/agenda";
import { formatInTimeZone } from "date-fns-tz";

const STAGE_DOT: Record<string, string> = {
  solicitacao: "bg-muted-foreground",
  planejamento: "bg-secondary-foreground",
  criacao: "bg-primary",
  aprovacao: "bg-warning",
  agendado: "bg-highlight",
  publicado: "bg-success",
};

export function AgendaDayCell({
  churchSlug,
  date,
  timezone,
  items,
  isCurrentMonth = true,
  compact = false,
}: {
  churchSlug: string;
  date: Date;
  timezone: string;
  items: AgendaItem[];
  isCurrentMonth?: boolean;
  compact?: boolean;
}) {
  const dayNumber = formatInTimeZone(date, timezone, "d");
  const isToday = formatInTimeZone(date, timezone, "yyyy-MM-dd") === formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const dateParam = formatInTimeZone(date, timezone, "yyyy-MM-dd");
  const visibleItems = compact ? items.slice(0, 3) : items;

  return (
    <div
      className={cn(
        "flex min-h-[92px] flex-col gap-1 rounded-lg border border-border p-1.5",
        !isCurrentMonth && "opacity-40",
        isToday && "border-primary"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-semibold", isToday && "text-primary")}>{dayNumber}</span>
        <Link
          href={`/app/${churchSlug}/producao/novo?data=${dateParam}`}
          className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label={`Criar conteúdo para ${dateParam}`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      <div className="flex flex-col gap-0.5">
        {visibleItems.map((item) => (
          <Link
            key={item.id}
            href={`/app/${churchSlug}/producao/${item.id}`}
            title={`${item.title} — ${STAGE_LABELS[item.stage]}`}
            className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] hover:bg-secondary"
          >
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STAGE_DOT[item.stage])} aria-hidden="true" />
            <span className="truncate">{item.title}</span>
          </Link>
        ))}
        {compact && items.length > 3 ? (
          <span className="px-1 text-[11px] text-muted-foreground">+{items.length - 3} mais</span>
        ) : null}
      </div>
    </div>
  );
}
