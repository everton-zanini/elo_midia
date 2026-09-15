import { z } from "zod";

/**
 * Valor bruto de um <input type="datetime-local"> (sem fuso), como
 * "2026-09-20T10:00". A conversão para o instante UTC correto, usando o
 * fuso da igreja, acontece no servidor — veja localInputToUtcIso.
 */
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, { message: "Informe data e horário completos." });

export const contentTypeSchema = z.enum([
  "arte",
  "carrossel",
  "video",
  "reels",
  "stories",
  "fotografia",
  "texto",
  "outro",
]);

export const prioritySchema = z.enum(["baixa", "normal", "alta", "urgente"]);

export const channelSchema = z.enum(["instagram", "facebook", "youtube", "whatsapp", "site", "outro"]);

export const membershipRoleSchema = z.enum(["admin", "coordinator", "collaborator"]);

export const createContentSchema = z.object({
  church_id: z.string().uuid(),
  title: z.string().trim().min(3, "Dê um título com pelo menos 3 caracteres.").max(200),
  description: z.string().trim().max(4000).optional().default(""),
  ministry_id: z.string().uuid().nullable().optional(),
  content_type: contentTypeSchema,
  priority: prioritySchema.optional().default("normal"),
  planned_publish_at: localDateTime.nullable().optional(),
});

export const updatePlannedPublishAtSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  planned_publish_at: localDateTime.nullable(),
});

export const updateContentInfoSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  title: z.string().trim().min(3, "Dê um título com pelo menos 3 caracteres.").max(200),
  description: z.string().trim().max(4000).optional().default(""),
  ministry_id: z.string().uuid().nullable().optional(),
  content_type: contentTypeSchema,
  priority: prioritySchema,
  reference_links: z.array(z.string().trim().url("Informe uma URL válida.")).max(20).optional().default([]),
});

export const updateCaptionSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  caption: z.string().trim().max(4000).optional().default(""),
});

export const setChannelsSchema = z.object({
  content_id: z.string().uuid(),
  channels: z.array(channelSchema).max(6),
});

export const reassignContentSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  assignee_id: z.string().uuid().nullable(),
});

export const sendToCreationSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  assignee_id: z.string().uuid("Selecione um responsável principal."),
  production_due_at: localDateTime,
});

export const sendToPlanningSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
});

export const sendToApprovalSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
});

export const requestChangesSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  comment: z.string().trim().min(1, "Descreva o que precisa ser alterado."),
});

export const scheduleContentSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  planned_publish_at: localDateTime,
});

export const confirmPublicationSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  published_url: z.string().trim().url("Informe uma URL válida.").optional().or(z.literal("")).optional(),
});

export const reopenContentSchema = z.object({
  content_id: z.string().uuid(),
  version: z.number().int().positive(),
  reason: z.string().trim().min(1, "Informe a justificativa da reabertura."),
});

export const checklistItemCreateSchema = z.object({
  content_id: z.string().uuid(),
  title: z.string().trim().min(1, "Descreva a tarefa."),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: localDateTime.nullable().optional(),
});

export const checklistItemUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).optional(),
  done: z.boolean().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: localDateTime.nullable().optional(),
});

export const commentCreateSchema = z.object({
  content_id: z.string().uuid(),
  body: z.string().trim().min(1, "Escreva um comentário."),
});

export const inviteCreateSchema = z.object({
  church_id: z.string().uuid(),
  email: z.string().trim().email("Informe um e-mail válido."),
  role: membershipRoleSchema,
});

export const ministryCreateSchema = z.object({
  church_id: z.string().uuid(),
  name: z.string().trim().min(2, "Dê um nome com pelo menos 2 caracteres."),
});

export const ministryUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Dê um nome com pelo menos 2 caracteres."),
});

export const churchSettingsSchema = z.object({
  church_id: z.string().uuid(),
  name: z.string().trim().min(2, "Dê um nome com pelo menos 2 caracteres."),
  timezone: z.string().trim().min(1),
});

export const memberRoleUpdateSchema = z.object({
  church_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: membershipRoleSchema,
});

export const attachmentExternalLinkSchema = z.object({
  content_id: z.string().uuid(),
  kind: z.enum(["publicavel", "referencia"]),
  external_url: z.string().trim().url("Informe uma URL válida."),
  file_name: z.string().trim().min(1).max(200),
});

/** Converte o primeiro erro de cada campo em um mapa simples para exibir no formulário. */
export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
