import type { ContentStage, MembershipRole } from "@/lib/supabase/types";

/**
 * Regras do fluxo de produção, centralizadas para serem usadas tanto na
 * interface (habilitar/desabilitar ações, rotular botões) quanto nas Server
 * Actions antes de qualquer escrita no banco. A autoridade final de cada
 * regra também é reforçada no banco (gatilhos e funções em supabase/migrations),
 * então nenhuma dessas checagens pode ser contornada só porque o cliente
 * enviou algo diferente do que a interface permite.
 */

export const STAGE_ORDER: ContentStage[] = [
  "solicitacao",
  "planejamento",
  "criacao",
  "aprovacao",
  "agendado",
  "publicado",
];

export const STAGE_LABELS: Record<ContentStage, string> = {
  solicitacao: "Solicitação",
  planejamento: "Planejamento",
  criacao: "Criação",
  aprovacao: "Aprovação",
  agendado: "Agendado",
  publicado: "Publicado",
};

export const PRIORITY_LABELS = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
} as const;

export const CONTENT_TYPE_LABELS = {
  arte: "Arte",
  carrossel: "Carrossel",
  video: "Vídeo",
  reels: "Reels",
  stories: "Stories",
  fotografia: "Fotografia",
  texto: "Texto",
  outro: "Outro",
} as const;

export const CHANNEL_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  site: "Site",
  outro: "Outro",
} as const;

export const MANAGER_ROLES: MembershipRole[] = ["admin", "coordinator"];

export function isManager(role: MembershipRole | null | undefined): boolean {
  return !!role && MANAGER_ROLES.includes(role);
}

export class WorkflowError extends Error {}

export interface WorkflowContentSnapshot {
  id: string;
  stage: ContentStage;
  assigneeId: string | null;
  archivedAt: string | null;
}

export interface WorkflowActor {
  userId: string;
  role: MembershipRole;
}

export type WorkflowActionId =
  | "enviar_para_planejamento"
  | "enviar_para_criacao"
  | "enviar_para_aprovacao"
  | "aprovar"
  | "solicitar_alteracoes"
  | "agendar"
  | "confirmar_publicacao"
  | "reabrir";

export const ACTION_LABELS: Record<WorkflowActionId, string> = {
  enviar_para_planejamento: "Enviar para planejamento",
  enviar_para_criacao: "Enviar para criação",
  enviar_para_aprovacao: "Enviar para aprovação",
  aprovar: "Aprovar",
  solicitar_alteracoes: "Solicitar alterações",
  agendar: "Agendar",
  confirmar_publicacao: "Confirmar publicação",
  reabrir: "Reabrir conteúdo",
};

function isAssignee(content: WorkflowContentSnapshot, actor: WorkflowActor): boolean {
  return content.assigneeId === actor.userId;
}

/**
 * Lista, em ordem de preferência, as ações que este ator pode executar agora
 * neste conteúdo. A primeira é a "ação principal" sugerida na interface.
 */
export function getAvailableActions(
  content: WorkflowContentSnapshot,
  actor: WorkflowActor,
  hasActiveApproval: boolean
): WorkflowActionId[] {
  if (content.archivedAt) return [];

  const manager = isManager(actor.role);
  const actions: WorkflowActionId[] = [];

  switch (content.stage) {
    case "solicitacao":
      if (manager) actions.push("enviar_para_criacao", "enviar_para_planejamento");
      break;
    case "planejamento":
      if (manager) actions.push("enviar_para_criacao");
      break;
    case "criacao":
      if (manager || isAssignee(content, actor)) actions.push("enviar_para_aprovacao");
      break;
    case "aprovacao":
      if (manager && !hasActiveApproval) actions.push("aprovar", "solicitar_alteracoes");
      if (manager && hasActiveApproval) actions.push("agendar");
      break;
    case "agendado":
      if (manager) actions.push("confirmar_publicacao");
      break;
    case "publicado":
      if (manager) actions.push("reabrir");
      break;
  }

  return actions;
}

export function getPrimaryAction(
  content: WorkflowContentSnapshot,
  actor: WorkflowActor,
  hasActiveApproval: boolean
): WorkflowActionId | null {
  return getAvailableActions(content, actor, hasActiveApproval)[0] ?? null;
}

export interface TransitionCheckInput {
  action: WorkflowActionId;
  content: WorkflowContentSnapshot;
  actor: WorkflowActor;
  hasActiveApproval: boolean;
  /** Necessário para "agendar": os canais são definidos durante a Criação, não no agendamento. */
  hasChannel?: boolean;
  payload?: {
    assigneeId?: string | null;
    productionDueAt?: string | null;
    plannedPublishAt?: string | null;
    comment?: string;
    reason?: string;
    publishedUrl?: string | null;
  };
}

/**
 * Valida se a transição é permitida. Lança WorkflowError com uma mensagem em
 * português pronta para exibir ao usuário quando não for. Não escreve nada —
 * apenas decide.
 */
export function assertTransition(input: TransitionCheckInput): void {
  const { action, content, actor, hasActiveApproval, hasChannel, payload } = input;
  const manager = isManager(actor.role);

  if (content.archivedAt) {
    throw new WorkflowError("Este conteúdo está arquivado. Restaure-o antes de continuar.");
  }

  const available = getAvailableActions(content, actor, hasActiveApproval);
  if (!available.includes(action)) {
    throw new WorkflowError(
      `A ação "${ACTION_LABELS[action]}" não está disponível para o estágio atual (${STAGE_LABELS[content.stage]}).`
    );
  }

  switch (action) {
    case "enviar_para_criacao":
      if (!payload?.assigneeId) {
        throw new WorkflowError("Selecione um responsável principal para entrar em Criação.");
      }
      if (!payload?.productionDueAt) {
        throw new WorkflowError("Defina o prazo de produção para entrar em Criação.");
      }
      break;
    case "solicitar_alteracoes":
      if (!payload?.comment || payload.comment.trim() === "") {
        throw new WorkflowError("Descreva o que precisa ser alterado.");
      }
      break;
    case "agendar":
      if (!hasActiveApproval) {
        throw new WorkflowError("Aprove o conteúdo antes de agendar.");
      }
      if (!hasChannel) {
        throw new WorkflowError("Selecione ao menos um canal antes de agendar.");
      }
      if (!payload?.plannedPublishAt) {
        throw new WorkflowError("Defina a data e o horário planejados de publicação.");
      }
      break;
    case "reabrir":
      if (!manager) {
        throw new WorkflowError("Apenas administradores e coordenadores podem reabrir um conteúdo publicado.");
      }
      if (!payload?.reason || payload.reason.trim() === "") {
        throw new WorkflowError("Informe a justificativa da reabertura.");
      }
      break;
  }
}

export const TARGET_STAGE: Record<WorkflowActionId, ContentStage> = {
  enviar_para_planejamento: "planejamento",
  enviar_para_criacao: "criacao",
  enviar_para_aprovacao: "aprovacao",
  aprovar: "aprovacao",
  solicitar_alteracoes: "criacao",
  agendar: "agendado",
  confirmar_publicacao: "publicado",
  reabrir: "criacao",
};

/** Campos cuja alteração invalida uma aprovação ativa (espelha os gatilhos do banco). */
export const APPROVAL_INVALIDATING_FIELDS = new Set(["caption", "channels", "publishable_attachments"]);

export function changeInvalidatesApproval(changedFields: Iterable<string>): boolean {
  for (const field of changedFields) {
    if (APPROVAL_INVALIDATING_FIELDS.has(field)) return true;
  }
  return false;
}

/** Conteúdo atrasado: prazo de produção venceu e ainda não foi aprovado/agendado/publicado. */
export function isProductionOverdue(content: {
  stage: ContentStage;
  productionDueAt: string | null;
  archivedAt: string | null;
}, now: Date = new Date()): boolean {
  if (content.archivedAt) return false;
  if (!content.productionDueAt) return false;
  if (["aprovacao", "agendado", "publicado"].includes(content.stage)) return false;
  return new Date(content.productionDueAt) < now;
}

/** Publicação atrasada: data planejada passou e o conteúdo ainda não foi confirmado como publicado. */
export function isPublicationOverdue(content: {
  stage: ContentStage;
  plannedPublishAt: string | null;
  archivedAt: string | null;
}, now: Date = new Date()): boolean {
  if (content.archivedAt) return false;
  if (!content.plannedPublishAt) return false;
  if (content.stage === "publicado") return false;
  return new Date(content.plannedPublishAt) < now;
}

/**
 * Espelha a proteção do último administrador (a garantia real é o gatilho
 * `memberships_protect_last_admin` no banco). Útil para desabilitar a ação na
 * interface antes mesmo de chamar o servidor.
 */
export function wouldRemoveLastAdmin(
  memberships: { userId: string; role: MembershipRole }[],
  targetUserId: string,
  newRole: MembershipRole | "remove"
): boolean {
  const target = memberships.find((m) => m.userId === targetUserId);
  if (!target || target.role !== "admin") return false;
  if (newRole === "admin") return false;

  const otherAdmins = memberships.filter((m) => m.userId !== targetUserId && m.role === "admin");
  return otherAdmins.length === 0;
}
