import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { requireChurchContext } from "@/server/church";
import { listAgendaItems, type AgendaFilters } from "@/server/data/agenda";
import { listMinistries } from "@/server/data/ministries";
import { listMembers } from "@/server/data/team";
import { AgendaFiltersBar } from "@/components/agenda/agenda-filters-bar";
import { AgendaClient } from "@/components/agenda/agenda-client";
import { Button } from "@/components/ui/button";
import type { Channel } from "@/lib/supabase/types";
import { localInputToUtcIso } from "@/lib/format";

export const metadata = { title: "Agenda editorial" };

function buildMonthGrid(monthKey: string, timezone: string): string[] {
  const firstOfMonth = localInputToUtcIso(`${monthKey}-01T00:00`, timezone);
  const firstWeekday = Number(formatInTimeZone(new Date(firstOfMonth), timezone, "i")) % 7; // 0 = domingo
  const gridStart = new Date(new Date(firstOfMonth).getTime() - firstWeekday * 86400000);

  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getTime() + i * 86400000).toISOString());
  }
  return days;
}

export default async function AgendaPage({
  params,
  searchParams,
}: PageProps<"/app/[churchSlug]/agenda">) {
  const { churchSlug } = await params;
  const sp = await searchParams;
  const { church, membership, supabase } = await requireChurchContext(churchSlug);

  const now = new Date();
  const currentMonthKey =
    typeof sp.mes === "string" ? sp.mes : formatInTimeZone(now, church.timezone, "yyyy-MM");

  const monthGridDays = buildMonthGrid(currentMonthKey, church.timezone);
  const rangeFrom = monthGridDays[0]!;
  const rangeTo = monthGridDays[monthGridDays.length - 1]!;

  const filters: AgendaFilters = {
    channel: typeof sp.canal === "string" ? (sp.canal as Channel) : undefined,
    assigneeId: typeof sp.responsavel === "string" ? sp.responsavel : undefined,
    ministryId: typeof sp.ministerio === "string" ? sp.ministerio : undefined,
  };

  const [items, itemsWithoutDate, ministries, members] = await Promise.all([
    listAgendaItems(supabase, church.id, { from: rangeFrom, to: rangeTo }, filters),
    listAgendaItems(supabase, church.id, null, filters),
    listMinistries(supabase, church.id),
    listMembers(supabase, church.id),
  ]);

  const [year, month] = currentMonthKey.split("-").map(Number);
  const prevMonth = new Date(Date.UTC(year!, month! - 2, 1));
  const nextMonth = new Date(Date.UTC(year!, month!, 1));
  const prevKey = `${prevMonth.getUTCFullYear()}-${String(prevMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const nextKey = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthLabel = formatInTimeZone(new Date(`${currentMonthKey}-15T12:00:00.000Z`), church.timezone, "MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const query = new URLSearchParams();
  if (filters.channel) query.set("canal", filters.channel);
  if (filters.assigneeId) query.set("responsavel", filters.assigneeId);
  if (filters.ministryId) query.set("ministerio", filters.ministryId);
  const qs = query.toString();

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold capitalize">{monthLabel}</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={
              <Link href={`/app/${churchSlug}/agenda?mes=${prevKey}${qs ? `&${qs}` : ""}`} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={
              <Link href={`/app/${churchSlug}/agenda?mes=${nextKey}${qs ? `&${qs}` : ""}`} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
        </div>
      </div>

      <AgendaFiltersBar
        ministries={ministries.map((m) => ({ value: m.id, label: m.name }))}
        members={members.map((m) => ({ value: m.userId, label: m.fullName }))}
      />

      <AgendaClient
        churchSlug={churchSlug}
        timezone={church.timezone}
        monthGridDays={monthGridDays}
        currentMonthKey={currentMonthKey}
        items={items}
        itemsWithoutDate={itemsWithoutDate}
        role={membership.role}
      />
    </div>
  );
}
