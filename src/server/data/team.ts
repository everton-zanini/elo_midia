import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/lib/supabase/types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export interface TeamMember {
  userId: string;
  fullName: string;
  email: string;
  role: MembershipRole;
  membershipId: string;
}

export async function listMembers(supabase: SupabaseServer, churchId: string): Promise<TeamMember[]> {
  const { data } = await supabase
    .from("memberships")
    .select("id, role, user_id, profiles(id, full_name, email)")
    .eq("church_id", churchId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { id: string; full_name: string; email: string };
    return {
      userId: row.user_id,
      membershipId: row.id,
      role: row.role as MembershipRole,
      fullName: profile?.full_name ?? "—",
      email: profile?.email ?? "",
    };
  });
}
