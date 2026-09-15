"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireChurchContext } from "@/server/church";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";
import { attachmentExternalLinkSchema } from "@/lib/validations";
import { ATTACHMENT_BUCKET, ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/attachments";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-140);
}

export async function createAttachmentUploadUrl(
  churchSlug: string,
  contentId: string,
  kind: "publicavel" | "referencia",
  fileName: string,
  mimeType: string
): Promise<ActionResult<{ path: string; token: string; signedUrl: string }>> {
  const { church, supabase } = await requireChurchContext(churchSlug);

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType)) {
    return fail("Tipo de arquivo não permitido. Veja os formatos aceitos na tela de anexos.");
  }

  const path = `${church.id}/${contentId}/${kind}/${randomUUID()}-${sanitizeFileName(fileName)}`;
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail(toUserMessage(error));

  return ok({ path, token: data.token, signedUrl: data.signedUrl });
}

export async function recordAttachment(
  churchSlug: string,
  contentId: string,
  input: { kind: "publicavel" | "referencia"; storagePath: string; fileName: string; mimeType: string; sizeBytes: number }
): Promise<ActionResult> {
  const { church, supabase } = await requireChurchContext(churchSlug);

  if (input.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    return fail("Arquivo muito grande. O limite é 50 MB — para vídeos grandes, use um link externo de referência.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("attachments").insert({
    content_id: contentId,
    church_id: church.id,
    uploaded_by: user!.id,
    kind: input.kind,
    storage_path: input.storagePath,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
  });
  if (error) return fail(toUserMessage(error));

  revalidatePath(`/app/${churchSlug}/producao/${contentId}`);
  return ok(undefined);
}

export async function addExternalLinkAttachment(churchSlug: string, formData: FormData): Promise<ActionResult> {
  const { church, supabase } = await requireChurchContext(churchSlug);
  const parsed = attachmentExternalLinkSchema.safeParse({
    content_id: formData.get("content_id"),
    kind: formData.get("kind"),
    external_url: formData.get("external_url"),
    file_name: formData.get("file_name"),
  });
  if (!parsed.success) return fail("Informe um link e um nome válidos.");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("attachments").insert({
    content_id: parsed.data.content_id,
    church_id: church.id,
    uploaded_by: user!.id,
    kind: parsed.data.kind,
    external_url: parsed.data.external_url,
    file_name: parsed.data.file_name,
  });
  if (error) return fail(toUserMessage(error));

  revalidatePath(`/app/${churchSlug}/producao/${parsed.data.content_id}`);
  return ok(undefined);
}

export async function deleteAttachment(churchSlug: string, contentId: string, attachmentId: string): Promise<ActionResult> {
  const { supabase } = await requireChurchContext(churchSlug);

  const { data: attachment } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();

  if (attachment?.storage_path) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([attachment.storage_path]);
  }

  const { error } = await supabase.from("attachments").delete().eq("id", attachmentId);
  if (error) return fail(toUserMessage(error));

  revalidatePath(`/app/${churchSlug}/producao/${contentId}`);
  return ok(undefined);
}

export async function getAttachmentDownloadUrl(churchSlug: string, storagePath: string): Promise<ActionResult<{ url: string }>> {
  const { supabase } = await requireChurchContext(churchSlug);
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(storagePath, 60 * 10);
  if (error || !data) return fail(toUserMessage(error));
  return ok({ url: data.signedUrl });
}
