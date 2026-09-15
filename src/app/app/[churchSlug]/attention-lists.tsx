import Link from "next/link";
import { AlertCircle, CalendarX2, CheckSquare, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AttentionSectionProps {
  title: string;
  icon: LucideIcon;
  tone: "highlight" | "warning" | "primary";
  emptyLabel: string;
  items: { key: string; title: string; meta: string; href: string }[];
}

const TONE_STYLES: Record<AttentionSectionProps["tone"], string> = {
  highlight: "bg-highlight/15 text-highlight-foreground",
  warning: "bg-warning/20 text-warning-foreground",
  primary: "bg-primary/10 text-primary",
};

function AttentionSection({ title, icon: Icon, tone, emptyLabel, items }: AttentionSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", TONE_STYLES[tone])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-sm font-semibold">{title}</h2>
        {items.length > 0 ? (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {items.length}
          </span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.slice(0, 6).map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
              >
                <span className="truncate font-medium">{item.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MyTasksSection({
  churchSlug,
  tasks,
}: {
  churchSlug: string;
  tasks: { id: string; title: string; content_id: string; content_title: string; due_at: string | null }[];
}) {
  return (
    <AttentionSection
      title="Minhas tarefas pendentes"
      icon={CheckSquare}
      tone="primary"
      emptyLabel="Nenhuma tarefa pendente atribuída a você. 🎉"
      items={tasks.map((t) => ({
        key: t.id,
        title: t.title,
        meta: t.due_at ? formatDate(t.due_at, "America/Sao_Paulo") : t.content_title,
        href: `/app/${churchSlug}/producao/${t.content_id}`,
      }))}
    />
  );
}

export function OverdueProductionSection({
  churchSlug,
  timezone,
  items,
}: {
  churchSlug: string;
  timezone: string;
  items: { id: string; title: string; production_due_at: string | null }[];
}) {
  return (
    <AttentionSection
      title="Conteúdos atrasados"
      icon={AlertCircle}
      tone="highlight"
      emptyLabel="Nenhum conteúdo atrasado."
      items={items.map((c) => ({
        key: c.id,
        title: c.title,
        meta: c.production_due_at ? `Prazo: ${formatDate(c.production_due_at, timezone)}` : "",
        href: `/app/${churchSlug}/producao/${c.id}`,
      }))}
    />
  );
}

export function OverduePublicationSection({
  churchSlug,
  timezone,
  items,
}: {
  churchSlug: string;
  timezone: string;
  items: { id: string; title: string; planned_publish_at: string | null }[];
}) {
  return (
    <AttentionSection
      title="Publicações sem confirmação"
      icon={CalendarX2}
      tone="warning"
      emptyLabel="Nenhuma publicação atrasada."
      items={items.map((c) => ({
        key: c.id,
        title: c.title,
        meta: c.planned_publish_at ? formatDateTime(c.planned_publish_at, timezone) : "",
        href: `/app/${churchSlug}/producao/${c.id}`,
      }))}
    />
  );
}

export function PendingApprovalsSection({
  churchSlug,
  items,
}: {
  churchSlug: string;
  items: { id: string; title: string }[];
}) {
  return (
    <AttentionSection
      title="Aprovações pendentes"
      icon={ClipboardCheck}
      tone="warning"
      emptyLabel="Nada aguardando aprovação."
      items={items.map((c) => ({
        key: c.id,
        title: c.title,
        meta: "Revisar",
        href: `/app/${churchSlug}/producao/${c.id}`,
      }))}
    />
  );
}
