import { ContentCard } from "./content-card";
import { ContentActionsMenu } from "./actions-menu";
import { CardOverflowMenu } from "./card-overflow-menu";
import { isManager, type WorkflowActor } from "@/lib/workflow";
import type { ContentListItem } from "@/server/data/contents";

export function ContentListView({
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
  if (contents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum conteúdo encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {contents.map((content) => (
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
    </div>
  );
}
