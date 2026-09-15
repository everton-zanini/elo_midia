import type { MembershipRole } from "@/lib/supabase/types";

export const ROLE_LABELS: Record<MembershipRole, string> = {
  admin: "Administrador",
  coordinator: "Coordenador",
  collaborator: "Colaborador",
};

export const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  admin: "Gerencia configurações, ministérios, membros e convites, e todos os conteúdos.",
  coordinator: "Gerencia conteúdos e tarefas, aprova, agenda e confirma publicações.",
  collaborator: "Cria solicitações e edita o material e checklist dos conteúdos sob sua responsabilidade.",
};
