"use server";

import { revalidatePath } from "next/cache";
import { requireChurchContext, requireRole } from "@/server/church";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";
import { flattenZodErrors, ministryCreateSchema, ministryUpdateSchema } from "@/lib/validations";

export async function createMinistry(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  requireRole(membership, ["admin"]);

  const parsed = ministryCreateSchema.safeParse({ church_id: church.id, name: formData.get("name") });
  if (!parsed.success) return fail("Verifique o nome do ministério.", flattenZodErrors(parsed.error));

  const { error } = await supabase.from("ministries").insert(parsed.data);
  if (error) return fail(toUserMessage(error));
  revalidatePath(`/app/${churchSlug}/configuracoes`);
  return ok(undefined);
}

export async function updateMinistry(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { membership, supabase } = await requireChurchContext(churchSlug);
  requireRole(membership, ["admin"]);

  const parsed = ministryUpdateSchema.safeParse({ id: formData.get("id"), name: formData.get("name") });
  if (!parsed.success) return fail("Verifique o nome do ministério.", flattenZodErrors(parsed.error));

  const { error } = await supabase.from("ministries").update({ name: parsed.data.name }).eq("id", parsed.data.id);
  if (error) return fail(toUserMessage(error));
  revalidatePath(`/app/${churchSlug}/configuracoes`);
  return ok(undefined);
}

export async function setMinistryArchived(churchSlug: string, ministryId: string, archived: boolean): Promise<ActionResult> {
  const { membership, supabase } = await requireChurchContext(churchSlug);
  requireRole(membership, ["admin"]);

  const { error } = await supabase
    .from("ministries")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", ministryId);

  if (error) return fail(toUserMessage(error));
  revalidatePath(`/app/${churchSlug}/configuracoes`);
  return ok(undefined);
}
