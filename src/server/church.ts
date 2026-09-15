import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Church, Membership, MembershipRole, Profile } from "@/lib/supabase/types";

export interface ChurchContext {
  church: Church;
  membership: Membership;
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Resolve a igreja a partir do slug da URL, mas NUNCA confia nele sozinho: a
 * consulta a `churches` já passa pela política de RLS (só retorna a igreja se
 * o usuário for membro) e, mesmo assim, confirmamos a participação de novo
 * explicitamente. Centralizar essa resolução aqui é o que permite, no
 * futuro, trocar a origem do identificador (de slug na URL para subdomínio)
 * sem tocar em nenhuma regra de autorização.
 */
export async function requireChurchContext(churchSlug: string): Promise<ChurchContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?proximo=/app/${churchSlug}`);

  const { data: church } = await supabase.from("churches").select("*").eq("slug", churchSlug).maybeSingle();
  if (!church) notFound();

  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("church_id", church.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return { church, membership, profile: profile!, supabase };
}

export function requireRole(membership: Membership, allowed: MembershipRole[]) {
  if (!allowed.includes(membership.role)) {
    throw new Error("Você não tem permissão para fazer isso.");
  }
}

export interface UserChurchSummary {
  church: Church;
  role: MembershipRole;
}

/** Lista as igrejas das quais o usuário autenticado participa, para o alternador de igrejas. */
export async function listUserChurches(): Promise<UserChurchSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("memberships")
    .select("role, churches(*)")
    .eq("user_id", user.id);

  return (data ?? [])
    .filter((row) => row.churches)
    .map((row) => ({ church: row.churches as unknown as Church, role: row.role as MembershipRole }));
}
