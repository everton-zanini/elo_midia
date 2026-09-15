import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Ministry } from "@/lib/supabase/types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export async function listMinistries(
  supabase: SupabaseServer,
  churchId: string,
  includeArchived = false
): Promise<Ministry[]> {
  let query = supabase.from("ministries").select("*").eq("church_id", churchId).order("name", { ascending: true });
  if (!includeArchived) query = query.is("archived_at", null);
  const { data } = await query;
  return data ?? [];
}
