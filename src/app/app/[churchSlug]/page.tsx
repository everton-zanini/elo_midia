import Link from "next/link";
import { Plus } from "lucide-react";
import { requireChurchContext } from "@/server/church";
import { getDashboardData } from "@/server/data/dashboard";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/content/badges";
import { formatDateTime } from "@/lib/format";
import { STAGE_LABELS, STAGE_ORDER, isManager } from "@/lib/workflow";
import {
  MyTasksSection,
  OverdueProductionSection,
  OverduePublicationSection,
  PendingApprovalsSection,
} from "./attention-lists";

export default async function DashboardPage({ params }: PageProps<"/app/[churchSlug]">) {
  const { churchSlug } = await params;
  const { church, membership, profile, supabase } = await requireChurchContext(churchSlug);
  const data = await getDashboardData(supabase, church.id, membership.user_id, membership.role);

  const firstName = profile.full_name.split(" ")[0] || profile.full_name;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Olá, {firstName}</h1>
          <p className="text-sm text-muted-foreground">{church.name}</p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href={`/app/${churchSlug}/producao/novo`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Criar conteúdo
            </Link>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="font-heading text-base font-semibold">O que precisa da sua atenção</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <MyTasksSection churchSlug={churchSlug} tasks={data.myPendingTasks} />
            <OverdueProductionSection churchSlug={churchSlug} timezone={church.timezone} items={data.overdueProduction} />
            {isManager(membership.role) ? (
              <PendingApprovalsSection churchSlug={churchSlug} items={data.pendingApprovals} />
            ) : null}
            <OverduePublicationSection churchSlug={churchSlug} timezone={church.timezone} items={data.overduePublication} />
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-sm font-semibold">Próximos 7 dias</h2>
          {data.upcomingPublications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma publicação planejada para os próximos dias.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.upcomingPublications.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/${churchSlug}/producao/${c.id}`}
                    className="flex flex-col gap-1 rounded-lg px-2 py-2 hover:bg-secondary"
                  >
                    <span className="truncate text-sm font-medium">{c.title}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {formatDateTime(c.planned_publish_at, church.timezone)}
                      <StageBadge stage={c.stage} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/app/${churchSlug}/agenda`}
            className="mt-3 block text-center text-sm font-medium text-primary hover:underline"
          >
            Ver agenda completa
          </Link>
        </section>
      </div>

      <section>
        <h2 className="mb-3 font-heading text-sm font-semibold">Resumo por etapa</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAGE_ORDER.map((stage) => (
            <Link
              key={stage}
              href={`/app/${churchSlug}/producao?etapa=${stage}`}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 hover:bg-secondary"
            >
              <span className="text-2xl font-bold">{data.stageCounts[stage]}</span>
              <span className="text-xs text-muted-foreground">{STAGE_LABELS[stage]}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
