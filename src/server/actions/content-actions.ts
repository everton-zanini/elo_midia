"use server";

import { revalidatePath } from "next/cache";
import { requireChurchContext } from "@/server/church";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";
import {
  createContentSchema,
  flattenZodErrors,
  reassignContentSchema,
  requestChangesSchema,
  scheduleContentSchema,
  sendToApprovalSchema,
  sendToCreationSchema,
  sendToPlanningSchema,
  setChannelsSchema,
  updateCaptionSchema,
  updateContentInfoSchema,
  confirmPublicationSchema,
  reopenContentSchema,
  updatePlannedPublishAtSchema,
} from "@/lib/validations";
import { assertTransition, isManager, WorkflowError, type WorkflowActor } from "@/lib/workflow";
import { localInputToUtcIso } from "@/lib/format";
import type { ContentRecord } from "@/lib/supabase/types";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function loadContent(supabase: SupabaseServer, contentId: string): Promise<ContentRecord> {
  const { data, error } = await supabase.from("contents").select("*").eq("id", contentId).maybeSingle();
  if (error) throw new Error(toUserMessage(error));
  if (!data) throw new WorkflowError("Conteúdo não encontrado.");
  return data;
}

async function hasActiveApproval(supabase: SupabaseServer, contentId: string): Promise<boolean> {
  const { data } = await supabase
    .from("approvals")
    .select("id")
    .eq("content_id", contentId)
    .is("invalidated_at", null)
    .limit(1);
  return !!data && data.length > 0;
}

async function hasChannel(supabase: SupabaseServer, contentId: string): Promise<boolean> {
  const { data } = await supabase.from("content_channels").select("id").eq("content_id", contentId).limit(1);
  return !!data && data.length > 0;
}

function revalidateContent(churchSlug: string, contentId: string) {
  revalidatePath(`/app/${churchSlug}/producao`);
  revalidatePath(`/app/${churchSlug}/producao/${contentId}`);
  revalidatePath(`/app/${churchSlug}`);
  revalidatePath(`/app/${churchSlug}/agenda`);
}

export async function createContent(churchSlug: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { church, supabase } = await requireChurchContext(churchSlug);

  const rawMinistry = formData.get("ministry_id");
  const parsed = createContentSchema.safeParse({
    church_id: church.id,
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    ministry_id: rawMinistry ? rawMinistry : null,
    content_type: formData.get("content_type"),
    priority: formData.get("priority") || "normal",
    planned_publish_at: formData.get("planned_publish_at") || null,
  });
  if (!parsed.success) return fail("Verifique os dados do conteúdo.", flattenZodErrors(parsed.error));

  const { planned_publish_at, ...rest } = parsed.data;
  const { data, error } = await supabase
    .from("contents")
    .insert({
      ...rest,
      planned_publish_at: planned_publish_at ? localInputToUtcIso(planned_publish_at, church.timezone) : null,
    })
    .select("id")
    .single();
  if (error || !data) return fail(toUserMessage(error));

  revalidateContent(churchSlug, data.id);
  return ok({ id: data.id });
}

export async function sendToPlanning(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { membership, supabase } = await requireChurchContext(churchSlug);
  const parsed = sendToPlanningSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
  });
  if (!parsed.success) return fail("Dados inválidos.");

  try {
    const content = await loadContent(supabase, parsed.data.content_id);
    const actor: WorkflowActor = { userId: membership.user_id, role: membership.role };
    assertTransition({
      action: "enviar_para_planejamento",
      content: { id: content.id, stage: content.stage, assigneeId: content.assignee_id, archivedAt: content.archived_at },
      actor,
      hasActiveApproval: false,
    });

    const { error } = await supabase
      .from("contents")
      .update({ stage: "planejamento" })
      .eq("id", content.id)
      .eq("version", parsed.data.version);
    if (error) return fail(toUserMessage(error));

    revalidateContent(churchSlug, content.id);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

export async function sendToCreation(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  const parsed = sendToCreationSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    assignee_id: formData.get("assignee_id"),
    production_due_at: formData.get("production_due_at"),
  });
  if (!parsed.success) return fail("Verifique responsável e prazo.", flattenZodErrors(parsed.error));

  const productionDueAtIso = localInputToUtcIso(parsed.data.production_due_at, church.timezone);

  try {
    const content = await loadContent(supabase, parsed.data.content_id);
    const actor: WorkflowActor = { userId: membership.user_id, role: membership.role };
    assertTransition({
      action: "enviar_para_criacao",
      content: { id: content.id, stage: content.stage, assigneeId: content.assignee_id, archivedAt: content.archived_at },
      actor,
      hasActiveApproval: false,
      payload: { assigneeId: parsed.data.assignee_id, productionDueAt: productionDueAtIso },
    });

    const { error } = await supabase
      .from("contents")
      .update({
        stage: "criacao",
        assignee_id: parsed.data.assignee_id,
        production_due_at: productionDueAtIso,
      })
      .eq("id", content.id)
      .eq("version", parsed.data.version);
    if (error) return fail(toUserMessage(error));

    revalidateContent(churchSlug, content.id);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

export async function sendToApproval(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { membership, supabase } = await requireChurchContext(churchSlug);
  const parsed = sendToApprovalSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
  });
  if (!parsed.success) return fail("Dados inválidos.");

  try {
    const content = await loadContent(supabase, parsed.data.content_id);
    const actor: WorkflowActor = { userId: membership.user_id, role: membership.role };
    assertTransition({
      action: "enviar_para_aprovacao",
      content: { id: content.id, stage: content.stage, assigneeId: content.assignee_id, archivedAt: content.archived_at },
      actor,
      hasActiveApproval: false,
    });

    const { error } = await supabase
      .from("contents")
      .update({ stage: "aprovacao" })
      .eq("id", content.id)
      .eq("version", parsed.data.version);
    if (error) return fail(toUserMessage(error));

    revalidateContent(churchSlug, content.id);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

export async function approveContent(churchSlug: string, contentId: string, version: number): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const { error } = await supabase.rpc("approve_content", { p_content_id: contentId, p_expected_version: version });
  if (error) return fail(toUserMessage(error));
  revalidateContent(churchSlug, contentId);
  return ok(undefined);
}

export async function requestChanges(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const parsed = requestChangesSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return fail("Descreva o que precisa ser alterado.", flattenZodErrors(parsed.error));

  const { error } = await supabase.rpc("request_changes", {
    p_content_id: parsed.data.content_id,
    p_comment: parsed.data.comment,
    p_expected_version: parsed.data.version,
  });
  if (error) return fail(toUserMessage(error));
  revalidateContent(churchSlug, parsed.data.content_id);
  return ok(undefined);
}

export async function scheduleContent(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  const parsed = scheduleContentSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    planned_publish_at: formData.get("planned_publish_at"),
  });
  if (!parsed.success) return fail("Defina a data e o horário planejados.", flattenZodErrors(parsed.error));

  const plannedPublishAtIso = localInputToUtcIso(parsed.data.planned_publish_at, church.timezone);

  try {
    const content = await loadContent(supabase, parsed.data.content_id);
    const actor: WorkflowActor = { userId: membership.user_id, role: membership.role };
    const [approved, channel] = await Promise.all([
      hasActiveApproval(supabase, content.id),
      hasChannel(supabase, content.id),
    ]);
    assertTransition({
      action: "agendar",
      content: { id: content.id, stage: content.stage, assigneeId: content.assignee_id, archivedAt: content.archived_at },
      actor,
      hasActiveApproval: approved,
      hasChannel: channel,
      payload: { plannedPublishAt: plannedPublishAtIso },
    });

    const { error } = await supabase.rpc("schedule_content", {
      p_content_id: parsed.data.content_id,
      p_planned_publish_at: plannedPublishAtIso,
      p_expected_version: parsed.data.version,
    });
    if (error) return fail(toUserMessage(error));

    revalidateContent(churchSlug, content.id);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

export async function confirmPublication(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const rawUrl = formData.get("published_url");
  const parsed = confirmPublicationSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    published_url: rawUrl || undefined,
  });
  if (!parsed.success) return fail("Verifique o link informado.", flattenZodErrors(parsed.error));

  const { error } = await supabase.rpc("confirm_publication", {
    p_content_id: parsed.data.content_id,
    p_published_url: parsed.data.published_url || null,
    p_expected_version: parsed.data.version,
  });
  if (error) return fail(toUserMessage(error));
  revalidateContent(churchSlug, parsed.data.content_id);
  return ok(undefined);
}

export async function reopenContent(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const parsed = reopenContentSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return fail("Informe a justificativa da reabertura.", flattenZodErrors(parsed.error));

  const { error } = await supabase.rpc("reopen_content", {
    p_content_id: parsed.data.content_id,
    p_reason: parsed.data.reason,
    p_expected_version: parsed.data.version,
  });
  if (error) return fail(toUserMessage(error));
  revalidateContent(churchSlug, parsed.data.content_id);
  return ok(undefined);
}

export async function updateContentInfo(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const rawMinistry = formData.get("ministry_id");
  const rawLinks = formData.get("reference_links");
  const parsed = updateContentInfoSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    ministry_id: rawMinistry && rawMinistry !== "none" ? rawMinistry : null,
    content_type: formData.get("content_type"),
    priority: formData.get("priority"),
    reference_links: typeof rawLinks === "string" && rawLinks.trim() ? rawLinks.split("\n").map((l) => l.trim()).filter(Boolean) : [],
  });
  if (!parsed.success) return fail("Verifique os dados do conteúdo.", flattenZodErrors(parsed.error));

  const { content_id, version, ...patch } = parsed.data;
  const { error } = await supabase.from("contents").update(patch).eq("id", content_id).eq("version", version);
  if (error) return fail(toUserMessage(error));

  revalidateContent(churchSlug, content_id);
  return ok(undefined);
}

export async function updateCaption(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const parsed = updateCaptionSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    caption: formData.get("caption") ?? "",
  });
  if (!parsed.success) return fail("Verifique a legenda.", flattenZodErrors(parsed.error));

  const { error } = await supabase
    .from("contents")
    .update({ caption: parsed.data.caption })
    .eq("id", parsed.data.content_id)
    .eq("version", parsed.data.version);
  if (error) return fail(toUserMessage(error));

  revalidateContent(churchSlug, parsed.data.content_id);
  return ok(undefined);
}

export async function setContentChannels(churchSlug: string, contentId: string, channels: string[]): Promise<ActionResult> {
  const { church, supabase } = await requireChurchContext(churchSlug);
  const parsed = setChannelsSchema.safeParse({ content_id: contentId, channels });
  if (!parsed.success) return fail("Selecione ao menos um canal válido.");

  const { data: current } = await supabase.from("content_channels").select("channel").eq("content_id", contentId);
  const currentSet = new Set((current ?? []).map((c) => c.channel));
  const desiredSet = new Set(parsed.data.channels);

  const toAdd = [...desiredSet].filter((c) => !currentSet.has(c));
  const toRemove = [...currentSet].filter((c) => !desiredSet.has(c));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("content_channels")
      .delete()
      .eq("content_id", contentId)
      .in("channel", toRemove);
    if (error) return fail(toUserMessage(error));
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("content_channels")
      .insert(toAdd.map((channel) => ({ content_id: contentId, church_id: church.id, channel })));
    if (error) return fail(toUserMessage(error));
  }

  revalidateContent(churchSlug, contentId);
  return ok(undefined);
}

export async function reassignContent(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const rawAssignee = formData.get("assignee_id");
  const parsed = reassignContentSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    assignee_id: rawAssignee ? rawAssignee : null,
  });
  if (!parsed.success) return fail("Selecione um responsável válido.");

  const { error } = await supabase
    .from("contents")
    .update({ assignee_id: parsed.data.assignee_id })
    .eq("id", parsed.data.content_id)
    .eq("version", parsed.data.version);
  if (error) return fail(toUserMessage(error));

  revalidateContent(churchSlug, parsed.data.content_id);
  return ok(undefined);
}

export async function setContentArchived(churchSlug: string, contentId: string, archived: boolean): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);
  const { error } = await supabase
    .from("contents")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", contentId);
  if (error) return fail(toUserMessage(error));

  revalidateContent(churchSlug, contentId);
  return ok(undefined);
}

export async function duplicateContent(churchSlug: string, contentId: string): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireChurchContext(churchSlug);
  const { data, error } = await supabase.rpc("duplicate_content", { p_content_id: contentId });
  if (error || !data) return fail(toUserMessage(error));

  revalidateContent(churchSlug, data);
  return ok({ id: data });
}

/**
 * Reagenda a data planejada de publicação a partir da Agenda. Restrita a
 * administrador/coordenador; o gatilho de histórico do banco já registra a
 * mudança automaticamente, sem invalidar a aprovação (só legenda, canais e
 * materiais publicáveis invalidam).
 */
export async function updatePlannedPublishAt(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  if (!isManager(membership.role)) {
    return fail("Apenas administradores e coordenadores podem alterar a data planejada.");
  }

  const raw = formData.get("planned_publish_at");
  const parsed = updatePlannedPublishAtSchema.safeParse({
    content_id: formData.get("content_id"),
    version: Number(formData.get("version")),
    planned_publish_at: raw || null,
  });
  if (!parsed.success) return fail("Data inválida.");

  const { error } = await supabase
    .from("contents")
    .update({
      planned_publish_at: parsed.data.planned_publish_at
        ? localInputToUtcIso(parsed.data.planned_publish_at, church.timezone)
        : null,
    })
    .eq("id", parsed.data.content_id)
    .eq("version", parsed.data.version);
  if (error) return fail(toUserMessage(error));

  revalidateContent(churchSlug, parsed.data.content_id);
  revalidatePath(`/app/${churchSlug}/agenda`);
  return ok(undefined);
}
