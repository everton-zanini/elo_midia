"use server";

import { revalidatePath } from "next/cache";
import { requireChurchContext } from "@/server/church";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";
import { commentCreateSchema, flattenZodErrors } from "@/lib/validations";

export async function addComment(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, supabase } = await requireChurchContext(churchSlug);
  const parsed = commentCreateSchema.safeParse({
    content_id: formData.get("content_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) return fail("Escreva um comentário.", flattenZodErrors(parsed.error));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("comments").insert({
    content_id: parsed.data.content_id,
    church_id: church.id,
    author_id: user!.id,
    body: parsed.data.body,
  });
  if (error) return fail(toUserMessage(error));

  revalidatePath(`/app/${churchSlug}/producao/${parsed.data.content_id}`);
  return ok(undefined);
}
