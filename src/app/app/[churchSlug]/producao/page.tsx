import Link from "next/link";
import { Plus } from "lucide-react";
import { requireChurchContext } from "@/server/church";
import { listContents, type ContentFilters } from "@/server/data/contents";
import { listMinistries } from "@/server/data/ministries";
import { listMembers } from "@/server/data/team";
import { localInputToUtcIso } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FiltersBar } from "@/components/content/filters-bar";
import { KanbanBoard } from "@/components/content/kanban-board";
import { ContentListView } from "@/components/content/content-list-view";
import { ViewToggle } from "@/components/content/view-toggle";
import type { ContentPriority, ContentStage, Channel } from "@/lib/supabase/types";

export const metadata = { title: "Produção" };

export default async function ProducaoPage({
  params,
  searchParams,
}: PageProps<"/app/[churchSlug]/producao">) {
  const { churchSlug } = await params;
  const sp = await searchParams;
  const getParam = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const { church, membership, supabase } = await requireChurchContext(churchSlug);

  const periodoTipo = getParam("periodo_tipo") === "publicacao" ? "publicacao" : "producao";
  const filters: ContentFilters = {
    q: getParam("q"),
    stage: getParam("etapa") as ContentStage | undefined,
    assigneeId: getParam("responsavel"),
    channel: getParam("canal") as Channel | undefined,
    ministryId: getParam("ministerio"),
    priority: getParam("prioridade") as ContentPriority | undefined,
    periodType: periodoTipo,
    periodFrom: getParam("periodo_de") ? localInputToUtcIso(`${getParam("periodo_de")}T00:00`, church.timezone) : undefined,
    periodTo: getParam("periodo_ate") ? localInputToUtcIso(`${getParam("periodo_ate")}T23:59`, church.timezone) : undefined,
  };

  const [contents, ministries, members, activeApprovalsRes] = await Promise.all([
    listContents(supabase, church.id, filters),
    listMinistries(supabase, church.id),
    listMembers(supabase, church.id),
    supabase.from("approvals").select("content_id").eq("church_id", church.id).is("invalidated_at", null),
  ]);

  const activeApprovalContentIds = new Set((activeApprovalsRes.data ?? []).map((a) => a.content_id));
  const memberOptions = members.map((m) => ({ value: m.userId, label: m.fullName }));
  const ministryOptions = ministries.map((m) => ({ value: m.id, label: m.name }));

  const actor = { userId: membership.user_id, role: membership.role };

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Produção</h1>
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

      <FiltersBar ministries={ministryOptions} members={memberOptions} showStageFilter />

      <ViewToggle
        kanban={
          <KanbanBoard
            churchSlug={churchSlug}
            contents={contents}
            timezone={church.timezone}
            actor={actor}
            members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
            activeApprovalContentIds={activeApprovalContentIds}
          />
        }
        list={
          <ContentListView
            churchSlug={churchSlug}
            contents={contents}
            timezone={church.timezone}
            actor={actor}
            members={members.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
            activeApprovalContentIds={activeApprovalContentIds}
          />
        }
      />
    </div>
  );
}
