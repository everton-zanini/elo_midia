import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { ContentStage } from "@/lib/supabase/types";
import { isManager } from "@/lib/workflow";
import type { MembershipRole } from "@/lib/supabase/types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export interface DashboardContentRow {
  id: string;
  title: string;
  stage: ContentStage;
  production_due_at: string | null;
  planned_publish_at: string | null;
  assignee_id: string | null;
}

export interface DashboardData {
  myPendingTasks: { id: string; title: string; content_id: string; content_title: string; due_at: string | null }[];
  overdueProduction: DashboardContentRow[];
  overduePublication: DashboardContentRow[];
  pendingApprovals: DashboardContentRow[];
  upcomingPublications: DashboardContentRow[];
  stageCounts: Record<ContentStage, number>;
}

const CONTENT_COLUMNS = "id, title, stage, production_due_at, planned_publish_at, assignee_id";

export async function getDashboardData(
  supabase: SupabaseServer,
  churchId: string,
  userId: string,
  role: MembershipRole
): Promise<DashboardData> {
  const nowIso = new Date().toISOString();
  const in7DaysIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [tasksRes, overdueProdRes, overduePubRes, approvalStageRes, activeApprovalsRes, upcomingRes, allStagesRes] =
    await Promise.all([
      supabase
        .from("checklist_items")
        .select("id, title, due_at, contents!inner(id, title, archived_at)")
        .eq("church_id", churchId)
        .eq("assignee_id", userId)
        .eq("done", false)
        .is("contents.archived_at", null),
      supabase
        .from("contents")
        .select(CONTENT_COLUMNS)
        .eq("church_id", churchId)
        .is("archived_at", null)
        .not("production_due_at", "is", null)
        .lt("production_due_at", nowIso)
        .in("stage", ["solicitacao", "planejamento", "criacao"]),
      supabase
        .from("contents")
        .select(CONTENT_COLUMNS)
        .eq("church_id", churchId)
        .is("archived_at", null)
        .not("planned_publish_at", "is", null)
        .lt("planned_publish_at", nowIso)
        .neq("stage", "publicado"),
      isManager(role)
        ? supabase.from("contents").select(CONTENT_COLUMNS).eq("church_id", churchId).is("archived_at", null).eq("stage", "aprovacao")
        : Promise.resolve({ data: [] as DashboardContentRow[] }),
      isManager(role)
        ? supabase.from("approvals").select("content_id").eq("church_id", churchId).is("invalidated_at", null)
        : Promise.resolve({ data: [] as { content_id: string }[] }),
      supabase
        .from("contents")
        .select(CONTENT_COLUMNS)
        .eq("church_id", churchId)
        .is("archived_at", null)
        .not("planned_publish_at", "is", null)
        .gte("planned_publish_at", nowIso)
        .lte("planned_publish_at", in7DaysIso)
        .order("planned_publish_at", { ascending: true }),
      supabase.from("contents").select("stage").eq("church_id", churchId).is("archived_at", null),
    ]);

  const activeApprovalContentIds = new Set((activeApprovalsRes.data ?? []).map((a) => a.content_id));
  const pendingApprovals = (approvalStageRes.data ?? []).filter((c) => !activeApprovalContentIds.has(c.id));

  const stageCounts: Record<ContentStage, number> = {
    solicitacao: 0,
    planejamento: 0,
    criacao: 0,
    aprovacao: 0,
    agendado: 0,
    publicado: 0,
  };
  for (const row of allStagesRes.data ?? []) {
    stageCounts[row.stage as ContentStage] += 1;
  }

  return {
    myPendingTasks: (tasksRes.data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      due_at: t.due_at,
      content_id: (t.contents as unknown as { id: string; title: string }).id,
      content_title: (t.contents as unknown as { id: string; title: string }).title,
    })),
    overdueProduction: overdueProdRes.data ?? [],
    overduePublication: overduePubRes.data ?? [],
    pendingApprovals,
    upcomingPublications: upcomingRes.data ?? [],
    stageCounts,
  };
}
