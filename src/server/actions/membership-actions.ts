"use server";

import { revalidatePath } from "next/cache";
import { requireChurchContext, requireRole } from "@/server/church";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";
import { flattenZodErrors, memberRoleUpdateSchema } from "@/lib/validations";

export async function updateMemberRole(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  requireRole(membership, ["admin"]);

  const parsed = memberRoleUpdateSchema.safeParse({
    church_id: church.id,
    user_id: formData.get("user_id"),
    role: formData.get("role"),
  });
  if (!parsed.success) return fail("Dados inválidos.", flattenZodErrors(parsed.error));

  const { error } = await supabase
    .from("memberships")
    .update({ role: parsed.data.role })
    .eq("church_id", parsed.data.church_id)
    .eq("user_id", parsed.data.user_id);

  if (error) return fail(toUserMessage(error));
  revalidatePath(`/app/${churchSlug}/equipe`);
  return ok(undefined);
}

/**
 * Remove o acesso de um membro. Conteúdos onde ele era o responsável
 * continuam com o nome dele preservado no histórico; a tela de Equipe sinaliza
 * esses conteúdos para que um novo responsável seja definido.
 */
export async function removeMember(churchSlug: string, userId: string): Promise<ActionResult> {
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  requireRole(membership, ["admin"]);

  const { error } = await supabase.from("memberships").delete().eq("church_id", church.id).eq("user_id", userId);
  if (error) return fail(toUserMessage(error));

  revalidatePath(`/app/${churchSlug}/equipe`);
  return ok(undefined);
}

export async function contentsNeedingNewAssignee(churchSlug: string, userId: string) {
  const { church, supabase } = await requireChurchContext(churchSlug);
  const { data } = await supabase
    .from("contents")
    .select("id, title, stage")
    .eq("church_id", church.id)
    .eq("assignee_id", userId)
    .is("archived_at", null)
    .neq("stage", "publicado");
  return data ?? [];
}
