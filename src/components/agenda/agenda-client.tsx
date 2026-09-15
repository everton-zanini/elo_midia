"use client";

import { useMemo, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { addDays, addWeeks, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { AgendaDayCell } from "./agenda-day-cell";
import { RescheduleControl } from "./reschedule-control";
import { StageBadge, ChannelBadge } from "@/components/content/badges";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { AgendaItem } from "@/server/data/agenda";
import { isManager } from "@/lib/workflow";
import type { MembershipRole } from "@/lib/supabase/types";

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function dayKey(date: Date | string, timezone: string) {
  return formatInTimeZone(typeof date === "string" ? new Date(date) : date, timezone, "yyyy-MM-dd");
}

export function AgendaClient({
  churchSlug,
  timezone,
  monthGridDays,
  currentMonthKey,
  items,
  itemsWithoutDate,
  role,
}: {
  churchSlug: string;
  timezone: string;
  monthGridDays: string[]; // ISO strings, one per grid cell (may include days from adjacent months)
  currentMonthKey: string; // "yyyy-MM" of the month being viewed
  items: AgendaItem[];
  itemsWithoutDate: AgendaItem[];
  role: MembershipRole;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [override, setOverride] = useState<"mes" | "semana" | "lista" | null>(null);
  const visao = override ?? (isDesktop ? "mes" : "lista");
  const setVisao = setOverride;
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  const grouped = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      if (!item.planned_publish_at) continue;
      const key = dayKey(item.planned_publish_at, timezone);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items, timezone]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button variant={visao === "mes" ? "secondary" : "ghost"} size="sm" onClick={() => setVisao("mes")}>
            Mês
          </Button>
          <Button variant={visao === "semana" ? "secondary" : "ghost"} size="sm" onClick={() => setVisao("semana")}>
            Semana
          </Button>
          <Button variant={visao === "lista" ? "secondary" : "ghost"} size="sm" onClick={() => setVisao("lista")}>
            Lista
          </Button>
        </div>
        {visao === "semana" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekStart((d) => addWeeks(d, -1))}>
              ← Semana anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart((d) => addWeeks(d, 1))}>
              Próxima semana →
            </Button>
          </div>
        ) : null}
      </div>

      {visao === "mes" ? (
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="px-1 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {monthGridDays.map((iso) => {
            const date = new Date(iso);
            const key = dayKey(date, timezone);
            return (
              <AgendaDayCell
                key={iso}
                churchSlug={churchSlug}
                date={date}
                timezone={timezone}
                items={grouped.get(key) ?? []}
                isCurrentMonth={key.slice(0, 7) === currentMonthKey}
                compact
              />
            );
          })}
        </div>
      ) : null}

      {visao === "semana" ? (
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((date) => {
            const key = dayKey(date, timezone);
            return (
              <AgendaDayCell key={key} churchSlug={churchSlug} date={date} timezone={timezone} items={grouped.get(key) ?? []} />
            );
          })}
        </div>
      ) : null}

      {visao === "lista" ? (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, dayItems]) => (
              <div key={key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm font-semibold capitalize">
                    {formatInTimeZone(new Date(`${key}T12:00:00.000Z`), timezone, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <Link href={`/app/${churchSlug}/producao/novo?data=${key}`} className="text-muted-foreground hover:text-foreground">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                {dayItems.map((item) => (
                  <AgendaListRow key={item.id} churchSlug={churchSlug} item={item} timezone={timezone} canReschedule={isManager(role)} />
                ))}
              </div>
            ))}
          {grouped.size === 0 ? <p className="text-sm text-muted-foreground">Nenhuma publicação planejada.</p> : null}
        </div>
      ) : null}

      <section className="rounded-xl border border-dashed border-border p-4">
        <h3 className="mb-2 font-heading text-sm font-semibold">Sem data definida</h3>
        {itemsWithoutDate.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum conteúdo sem data.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {itemsWithoutDate.map((item) => (
              <AgendaListRow key={item.id} churchSlug={churchSlug} item={item} timezone={timezone} canReschedule={isManager(role)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AgendaListRow({
  churchSlug,
  item,
  timezone,
  canReschedule,
}: {
  churchSlug: string;
  item: AgendaItem;
  timezone: string;
  canReschedule: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <Link href={`/app/${churchSlug}/producao/${item.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
        {item.title}
      </Link>
      <StageBadge stage={item.stage} />
      <div className="hidden gap-1 sm:flex">
        {item.channels.map((c) => (
          <ChannelBadge key={c} channel={c} />
        ))}
      </div>
      {canReschedule ? (
        <RescheduleControl
          churchSlug={churchSlug}
          contentId={item.id}
          version={item.version}
          plannedPublishAt={item.planned_publish_at}
          timezone={timezone}
        />
      ) : null}
    </div>
  );
}
