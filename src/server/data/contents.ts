import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Channel, ContentPriority, ContentStage, ContentType } from "@/lib/supabase/types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export interface ContentFilters {
  q?: string;
  stage?: ContentStage;
  assigneeId?: string;
  channel?: Channel;
  ministryId?: string;
  priority?: ContentPriority;
  periodType?: "producao" | "publicacao";
  periodFrom?: string;
  periodTo?: string;
  includeArchived?: boolean;
}

export interface ContentListItem {
  id: string;
  title: string;
  stage: ContentStage;
  priority: ContentPriority;
  content_type: ContentType;
  production_due_at: string | null;
  planned_publish_at: string | null;
  archived_at: string | null;
  version: number;
  assignee: { id: string; full_name: string } | null;
  ministry: { id: string; name: string } | null;
  channels: Channel[];
}

const LIST_SELECT =
  "id, title, stage, priority, content_type, production_due_at, planned_publish_at, archived_at, version, assignee:profiles!contents_assignee_id_fkey(id, full_name), ministry:ministries(id, name), content_channels(channel)";

export async function listContents(
  supabase: SupabaseServer,
  churchId: string,
  filters: ContentFilters
): Promise<ContentListItem[]> {
  let query = supabase.from("contents").select(LIST_SELECT).eq("church_id", churchId);

  if (filters.includeArchived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (filters.q) query = query.ilike("title", `%${filters.q}%`);
  if (filters.stage) query = query.eq("stage", filters.stage);
  if (filters.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
  if (filters.ministryId) query = query.eq("ministry_id", filters.ministryId);
  if (filters.priority) query = query.eq("priority", filters.priority);

  const dateColumn = filters.periodType === "publicacao" ? "planned_publish_at" : "production_due_at";
  if (filters.periodFrom) query = query.gte(dateColumn, filters.periodFrom);
  if (filters.periodTo) query = query.lte(dateColumn, filters.periodTo);

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as unknown as (Omit<ContentListItem, "channels" | "assignee" | "ministry"> & {
    assignee: { id: string; full_name: string } | null;
    ministry: { id: string; name: string } | null;
    content_channels: { channel: Channel }[];
  })[];

  if (filters.channel) {
    rows = rows.filter((r) => r.content_channels.some((c) => c.channel === filters.channel));
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    stage: r.stage,
    priority: r.priority,
    version: r.version,
    content_type: r.content_type,
    production_due_at: r.production_due_at,
    planned_publish_at: r.planned_publish_at,
    archived_at: r.archived_at,
    assignee: r.assignee,
    ministry: r.ministry,
    channels: r.content_channels.map((c) => c.channel),
  }));
}

export interface ContentDetail extends ContentListItem {
  description: string;
  caption: string;
  reference_links: string[];
  requester: { id: string; full_name: string } | null;
  published_at: string | null;
  published_url: string | null;
  published_by: { id: string; full_name: string } | null;
  version: number;
  duplicated_from: string | null;
  created_at: string;
}

const DETAIL_SELECT = `id, title, description, stage, priority, content_type, production_due_at, planned_publish_at,
  caption, reference_links, archived_at, published_at, published_url, version, duplicated_from, created_at,
  assignee:profiles!contents_assignee_id_fkey(id, full_name),
  requester:profiles!contents_requester_id_fkey(id, full_name),
  published_by:profiles!contents_published_by_fkey(id, full_name),
  ministry:ministries(id, name),
  content_channels(channel)`;

export async function getContentDetail(supabase: SupabaseServer, contentId: string): Promise<ContentDetail | null> {
  const { data, error } = await supabase.from("contents").select(DETAIL_SELECT).eq("id", contentId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as ContentDetail & { content_channels: { channel: Channel }[] };
  return {
    ...row,
    channels: row.content_channels.map((c) => c.channel),
  };
}

export async function hasActiveApproval(supabase: SupabaseServer, contentId: string): Promise<boolean> {
  const { data } = await supabase
    .from("approvals")
    .select("id")
    .eq("content_id", contentId)
    .is("invalidated_at", null)
    .limit(1);
  return !!data && data.length > 0;
}
