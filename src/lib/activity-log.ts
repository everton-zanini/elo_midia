import { STAGE_LABELS } from "@/lib/workflow";
import type { ContentStage } from "@/lib/supabase/types";

export function describeActivity(action: string, metadata: Record<string, unknown>): string {
  switch (action) {
    case "content_created":
      return "Conteúdo criado.";
    case "stage_changed": {
      const from = metadata.from as ContentStage | undefined;
      const to = metadata.to as ContentStage | undefined;
      if (!from || !to) return "Etapa alterada.";
      return `Etapa alterada de "${STAGE_LABELS[from]}" para "${STAGE_LABELS[to]}".`;
    }
    case "planned_publish_at_changed":
      return "Data planejada de publicação alterada.";
    case "assignee_changed":
      return "Responsável alterado.";
    case "approved":
      return "Conteúdo aprovado.";
    case "changes_requested":
      return `Alterações solicitadas: "${metadata.comment ?? ""}"`;
    case "published":
      return "Publicação confirmada.";
    case "reopened":
      return `Conteúdo reaberto: "${metadata.reason ?? ""}"`;
    default:
      return action;
  }
}
