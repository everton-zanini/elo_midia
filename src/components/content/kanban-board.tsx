import { STAGE_LABELS, STAGE_ORDER, isManager } from "@/lib/workflow";
import type { WorkflowActor } from "@/lib/workflow";
import type { ContentListItem } from "@/server/data/contents";
import { ContentCard } from "./content-card";
import { ContentActionsMenu } from "./actions-menu";
import { CardOverflowMenu } from "./card-overflow-menu";

export function KanbanBoard({
  churchSlug,
  contents,
  timezone,
  actor,
  members,
  activeApprovalContentIds,
}: {
  churchSlug: string;
  contents: ContentListItem[];
  timezone: string;
  actor: WorkflowActor;
  members: { userId: string; fullName: string }[];
  activeApprovalContentIds: Set<string>;
}) {
  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    items: contents.filter((c) => c.stage === stage),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" role="group" aria-label="Quadro de produção por etapa">
      {byStage.map(({ stage, items }) => (
        <div key={stage} className="flex w-72 shrink-0 flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-heading text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {items.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((content) => (
              <ContentCard
                key={content.id}
                churchSlug={churchSlug}
                content={content}
                timezone={timezone}
                actions={
                  <div className="flex items-center gap-1">
                    <ContentActionsMenu
                      churchSlug={churchSlug}
                      content={{
                        id: content.id,
                        stage: content.stage,
                        assigneeId: content.assignee?.id ?? null,
                        archivedAt: content.archived_at,
                        version: content.version,
                      }}
                      actor={actor}
                      hasActiveApproval={activeApprovalContentIds.has(content.id)}
                      hasChannel={content.channels.length > 0}
                      members={members}
                      timezone={timezone}
                      mode="menu"
                    />
                    <CardOverflowMenu
                      churchSlug={churchSlug}
                      contentId={content.id}
                      archived={!!content.archived_at}
                      canDuplicate={isManager(actor.role) || content.assignee?.id === actor.userId}
                      role={actor.role}
                    />
                  </div>
                }
              />
            ))}
            {items.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">Nenhum conteúdo aqui.</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
