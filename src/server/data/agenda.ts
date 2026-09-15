import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Channel, ContentStage } from "@/lib/supabase/types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export interface AgendaItem {
  id: string;
  title: string;
  stage: ContentStage;
  planned_publish_at: string | null;
  version: number;
  assignee: { id: string; full_name: string } | null;
  ministry: { id: string; name: string } | null;
  channels: Channel[];
}

export interface AgendaFilters {
  channel?: Channel;
  assigneeId?: string;
  ministryId?: string;
}

const SELECT =
  "id, title, stage, planned_publish_at, version, assignee:profiles!contents_assignee_id_fkey(id, full_name), ministry:ministries(id, name), content_channels(channel)";

export async function listAgendaItems(
  supabase: SupabaseServer,
  churchId: string,
  range: { from: string; to: string } | null,
  filters: AgendaFilters
): Promise<AgendaItem[]> {
  let query = supabase.from("contents").select(SELECT).eq("church_id", churchId).is("archived_at", null);

  if (range) {
    query = query.gte("planned_publish_at", range.from).lte("planned_publish_at", range.to);
  } else {
    query = query.is("planned_publish_at", null).not("stage", "eq", "publicado");
  }

  if (filters.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
  if (filters.ministryId) query = query.eq("ministry_id", filters.ministryId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as unknown as (Omit<AgendaItem, "channels"> & { content_channels: { channel: Channel }[] })[];
  if (filters.channel) {
    rows = rows.filter((r) => r.content_channels.some((c) => c.channel === filters.channel));
  }

  return rows.map((r) => ({ ...r, channels: r.content_channels.map((c) => c.channel) }));
}
