"use server";

import { revalidatePath } from "next/cache";
import { requireChurchContext, requireRole } from "@/server/church";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";
import { churchSettingsSchema, flattenZodErrors } from "@/lib/validations";

export async function updateChurchSettings(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  requireRole(membership, ["admin"]);

  const parsed = churchSettingsSchema.safeParse({
    church_id: church.id,
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return fail("Verifique os dados da igreja.", flattenZodErrors(parsed.error));

  const { error } = await supabase
    .from("churches")
    .update({ name: parsed.data.name, timezone: parsed.data.timezone })
    .eq("id", parsed.data.church_id);

  if (error) return fail(toUserMessage(error));
  revalidatePath(`/app/${churchSlug}/configuracoes`);
  return ok(undefined);
}
