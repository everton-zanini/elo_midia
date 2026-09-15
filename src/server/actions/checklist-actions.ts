"use server";

import { revalidatePath } from "next/cache";
import { requireChurchContext } from "@/server/church";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";
import { checklistItemCreateSchema, checklistItemUpdateSchema, flattenZodErrors } from "@/lib/validations";
import { localInputToUtcIso } from "@/lib/format";

function revalidateContent(churchSlug: string, contentId: string) {
  revalidatePath(`/app/${churchSlug}/producao/${contentId}`);
}

export async function addChecklistItem(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, supabase } = await requireChurchContext(churchSlug);
  const rawAssignee = formData.get("assignee_id");
  const rawDue = formData.get("due_at");
  const parsed = checklistItemCreateSchema.safeParse({
    content_id: formData.get("content_id"),
    title: formData.get("title"),
    assignee_id: rawAssignee ? rawAssignee : null,
    due_at: rawDue ? rawDue : null,
  });
  if (!parsed.success) return fail("Descreva a tarefa.", flattenZodErrors(parsed.error));

  const { data: existing } = await supabase
    .from("checklist_items")
    .select("position")
    .eq("content_id", parsed.data.content_id)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? 0) + 1;

  const { error } = await supabase.from("checklist_items").insert({
    content_id: parsed.data.content_id,
    church_id: church.id,
    title: parsed.data.title,
    assignee_id: parsed.data.assignee_id,
    due_at: parsed.data.due_at ? localInputToUtcIso(parsed.data.due_at, church.timezone) : null,
    position: nextPosition,
  });
  if (error) return fail(toUserMessage(error));

  revalidateContent(churchSlug, parsed.data.content_id);
  return ok(undefined);
}

export async function updateChecklistItem(churchSlug: string, contentId: string, formData: FormData): Promise<ActionResult> {
  const { church, supabase } = await requireChurchContext(churchSlug);
  const rawDone = formData.get("done");
  const parsed = checklistItemUpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title") || undefined,
    done: rawDone === null ? undefined : rawDone === "true",
    assignee_id: formData.has("assignee_id") ? formData.get("assignee_id") || null : undefined,
    due_at: formData.has("due_at") ? formData.get("due_at") || null : undefined,
  });
  if (!parsed.success) return fail("Dados inválidos.");

  const { id, due_at, ...patch } = parsed.data;
  const { error } = await supabase
    .from("checklist_items")
    .update({ ...patch, ...(due_at !== undefined ? { due_at: due_at ? localInputToUtcIso(due_at, church.timezone) : null } : {}) })
    .eq("id", id);
  if (error) return fail(toUserMessage(error));

  revalidateContent(churchSlug, contentId);
  return ok(undefined);
}

export async function toggleChecklistItem(churchSlug: string, contentId: string, itemId: string, done: boolean): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const { error } = await supabase.from("checklist_items").update({ done }).eq("id", itemId);
  if (error) return fail(toUserMessage(error));
  revalidateContent(churchSlug, contentId);
  return ok(undefined);
}

export async function deleteChecklistItem(churchSlug: string, contentId: string, itemId: string): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);
  if (error) return fail(toUserMessage(error));
  revalidateContent(churchSlug, contentId);
  return ok(undefined);
}
