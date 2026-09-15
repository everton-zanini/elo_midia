import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireChurchContext } from "@/server/church";
import { getContentDetail, hasActiveApproval } from "@/server/data/contents";
import { getContentRelated } from "@/server/data/content-related";
import { listMinistries } from "@/server/data/ministries";
import { listMembers } from "@/server/data/team";
import { StageBadge, PriorityBadge, ContentTypeBadge } from "@/components/content/badges";
import { ContentActionsMenu } from "@/components/content/actions-menu";
import { CardOverflowMenu } from "@/components/content/card-overflow-menu";
import { ContentDetailsForm } from "@/components/content/content-details-form";
import { CaptionSection, ChannelsSection } from "@/components/content/caption-and-channels";
import { AttachmentsSection } from "@/components/content/attachments-section";
import { ChecklistSection } from "@/components/content/checklist-section";
import { CommentsSection } from "@/components/content/comments-section";
import { ReassignForm } from "@/components/content/reassign-form";
import { formatDateTime } from "@/lib/format";
import { describeActivity } from "@/lib/activity-log";
import { isManager } from "@/lib/workflow";

export default async function ContentDetailPage({
  params,
}: PageProps<"/app/[churchSlug]/producao/[contentId]">) {
  const { churchSlug, contentId } = await params;
  const { church, membership, supabase } = await requireChurchContext(churchSlug);

  const content = await getContentDetail(supabase, contentId);
  if (!content) notFound();

  const [related, approved, ministries, members] = await Promise.all([
    getContentRelated(supabase, contentId),
    hasActiveApproval(supabase, contentId),
    listMinistries(supabase, church.id),
    listMembers(supabase, church.id),
  ]);

  const manager = isManager(membership.role);
  const isAssignee = content.assignee?.id === membership.user_id;
  const canEdit = (manager || (isAssignee && content.stage === "criacao")) && content.stage !== "publicado";
  const memberOptions = members.map((m) => ({ userId: m.userId, fullName: m.fullName }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Link href={`/app/${churchSlug}/producao`} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Produção
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={content.stage} />
            <PriorityBadge priority={content.priority} />
            <ContentTypeBadge type={content.content_type} />
            {content.archived_at ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Arquivado</span>
            ) : null}
            {content.stage === "aprovacao" && approved ? (
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                Aprovado — aguardando agendamento
              </span>
            ) : null}
          </div>
          <h1 className="font-heading text-2xl font-bold">{content.title}</h1>
        </div>
        <CardOverflowMenu
          churchSlug={churchSlug}
          contentId={content.id}
          archived={!!content.archived_at}
          canDuplicate={manager || isAssignee || content.requester?.id === membership.user_id}
          role={membership.role}
        />
      </div>

      <ContentActionsMenu
        churchSlug={churchSlug}
        content={{
          id: content.id,
          stage: content.stage,
          assigneeId: content.assignee?.id ?? null,
          archivedAt: content.archived_at,
          version: content.version,
        }}
        actor={{ userId: membership.user_id, role: membership.role }}
        hasActiveApproval={approved}
        hasChannel={content.channels.length > 0}
        members={memberOptions}
        timezone={church.timezone}
        mode="buttons"
      />

      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Responsável</p>
          {manager ? (
            <ReassignForm
              churchSlug={churchSlug}
              contentId={content.id}
              version={content.version}
              currentAssigneeId={content.assignee?.id ?? null}
              members={memberOptions}
            />
          ) : (
            <p className="text-sm font-medium">{content.assignee?.full_name ?? "Sem responsável"}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Solicitante</p>
          <p className="text-sm font-medium">{content.requester?.full_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Prazo de produção</p>
          <p className="text-sm font-medium">{formatDateTime(content.production_due_at, church.timezone)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {content.stage === "publicado" ? "Publicado em" : "Publicação planejada"}
          </p>
          <p className="text-sm font-medium">
            {content.stage === "publicado"
              ? formatDateTime(content.published_at, church.timezone)
              : formatDateTime(content.planned_publish_at, church.timezone)}
          </p>
          {content.published_url ? (
            <a href={content.published_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              Ver publicação
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ContentDetailsForm churchSlug={churchSlug} content={content} ministries={ministries} readOnly={!canEdit} />
          <CaptionSection
            churchSlug={churchSlug}
            contentId={content.id}
            version={content.version}
            caption={content.caption}
            readOnly={!canEdit}
          />
          <ChannelsSection churchSlug={churchSlug} contentId={content.id} channels={content.channels} readOnly={!canEdit} />
          <AttachmentsSection
            churchSlug={churchSlug}
            contentId={content.id}
            attachments={related.attachments}
            canEditPublishable={canEdit}
          />
          <ChecklistSection
            churchSlug={churchSlug}
            contentId={content.id}
            items={related.checklist}
            members={memberOptions}
            timezone={church.timezone}
            canManage={canEdit}
            currentUserId={membership.user_id}
          />
          <CommentsSection churchSlug={churchSlug} contentId={content.id} comments={related.comments} timezone={church.timezone} />
        </div>

        <div className="flex flex-col gap-4">
          {related.approvals.length > 0 ? (
            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 font-heading text-sm font-semibold">Aprovações</h3>
              <ul className="flex flex-col gap-2 text-sm">
                {related.approvals.map((a) => (
                  <li key={a.id} className={a.invalidated_at ? "text-muted-foreground" : ""}>
                    <p>
                      {a.approved_by?.full_name ?? "—"} em {formatDateTime(a.created_at, church.timezone)}
                    </p>
                    {a.invalidated_at ? (
                      <p className="text-xs">Invalidada: {a.invalidated_reason}</p>
                    ) : (
                      <p className="text-xs text-success">Ativa</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 font-heading text-sm font-semibold">Histórico</h3>
            {related.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {related.activity.map((a) => (
                  <li key={a.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                    <p>{describeActivity(a.action, a.metadata)}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.actor?.full_name ?? "Sistema"} · {formatDateTime(a.created_at, church.timezone)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
