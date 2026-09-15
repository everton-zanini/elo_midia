import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Invite } from "@/lib/supabase/types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export async function listPendingInvites(supabase: SupabaseServer, churchId: string): Promise<Invite[]> {
  const { data } = await supabase
    .from("invites")
    .select("*")
    .eq("church_id", churchId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}
