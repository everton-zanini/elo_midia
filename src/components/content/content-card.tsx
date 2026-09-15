import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PriorityBadge, ChannelBadge, CONTENT_TYPE_STYLES } from "@/components/content/badges";
import { getInitials, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContentListItem } from "@/server/data/contents";
import { isProductionOverdue } from "@/lib/workflow";

export function ContentCard({
  churchSlug,
  content,
  timezone,
  actions,
}: {
  churchSlug: string;
  content: ContentListItem;
  timezone: string;
  actions?: React.ReactNode;
}) {
  const overdue = isProductionOverdue(
    { stage: content.stage, productionDueAt: content.production_due_at, archivedAt: content.archived_at },
    new Date()
  );
  const { bg: typeBg, icon: TypeIcon } = CONTENT_TYPE_STYLES[content.content_type];

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border border-border p-3 shadow-sm", typeBg)}>
      <Link
        href={`/app/${churchSlug}/producao/${content.id}`}
        className="flex items-start gap-1.5 font-medium leading-snug hover:underline"
      >
        <TypeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>{content.title}</span>
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={content.priority} />
        {content.channels.map((c) => (
          <ChannelBadge key={c} channel={c} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {content.assignee ? (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-secondary text-[10px] text-secondary-foreground">
                {getInitials(content.assignee.full_name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-xs text-muted-foreground">Sem responsável</span>
          )}
          {content.production_due_at ? (
            <span className={cn("text-xs", overdue ? "font-semibold text-highlight-foreground" : "text-muted-foreground")}>
              {formatDate(content.production_due_at, timezone)}
            </span>
          ) : null}
        </div>
        {actions}
      </div>
    </div>
  );
}
