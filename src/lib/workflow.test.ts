import { describe, expect, it } from "vitest";
import {
  assertTransition,
  changeInvalidatesApproval,
  getAvailableActions,
  isProductionOverdue,
  isPublicationOverdue,
  WorkflowError,
  wouldRemoveLastAdmin,
  type WorkflowActor,
  type WorkflowContentSnapshot,
} from "./workflow";

function content(overrides: Partial<WorkflowContentSnapshot> = {}): WorkflowContentSnapshot {
  return { id: "c1", stage: "solicitacao", assigneeId: null, archivedAt: null, ...overrides };
}

const admin: WorkflowActor = { userId: "admin-1", role: "admin" };
const coordinator: WorkflowActor = { userId: "coord-1", role: "coordinator" };
const collaborator: WorkflowActor = { userId: "collab-1", role: "collaborator" };

describe("getAvailableActions", () => {
  it("permite que admin/coordenador façam a triagem de uma solicitação", () => {
    expect(getAvailableActions(content({ stage: "solicitacao" }), admin, false)).toContain("enviar_para_criacao");
    expect(getAvailableActions(content({ stage: "solicitacao" }), coordinator, false)).toContain(
      "enviar_para_planejamento"
    );
  });

  it("não permite que colaborador faça a triagem", () => {
    expect(getAvailableActions(content({ stage: "solicitacao" }), collaborator, false)).toEqual([]);
  });

  it("permite que o responsável envie para aprovação, mas não outro colaborador", () => {
    const c = content({ stage: "criacao", assigneeId: "collab-1" });
    expect(getAvailableActions(c, collaborator, false)).toContain("enviar_para_aprovacao");
    expect(getAvailableActions(c, { userId: "outro", role: "collaborator" }, false)).toEqual([]);
  });

  it("colaborador nunca aprova, solicita alterações, agenda ou confirma publicação", () => {
    expect(getAvailableActions(content({ stage: "aprovacao" }), collaborator, false)).toEqual([]);
    expect(getAvailableActions(content({ stage: "aprovacao" }), collaborator, true)).toEqual([]);
    expect(getAvailableActions(content({ stage: "agendado" }), collaborator, true)).toEqual([]);
  });

  it("só oferece agendar quando já existe aprovação ativa", () => {
    const c = content({ stage: "aprovacao" });
    expect(getAvailableActions(c, admin, false)).toEqual(["aprovar", "solicitar_alteracoes"]);
    expect(getAvailableActions(c, admin, true)).toEqual(["agendar"]);
  });

  it("conteúdo arquivado não tem nenhuma ação", () => {
    const c = content({ stage: "criacao", assigneeId: "admin-1", archivedAt: new Date().toISOString() });
    expect(getAvailableActions(c, admin, false)).toEqual([]);
  });

  it("publicado só permite reabrir, e só para quem gerencia", () => {
    const c = content({ stage: "publicado" });
    expect(getAvailableActions(c, admin, true)).toEqual(["reabrir"]);
    expect(getAvailableActions(c, collaborator, true)).toEqual([]);
  });
});

describe("assertTransition", () => {
  it("exige responsável e prazo para entrar em criação", () => {
    const c = content({ stage: "solicitacao" });
    expect(() =>
      assertTransition({ action: "enviar_para_criacao", content: c, actor: admin, hasActiveApproval: false })
    ).toThrow(WorkflowError);

    expect(() =>
      assertTransition({
        action: "enviar_para_criacao",
        content: c,
        actor: admin,
        hasActiveApproval: false,
        payload: { assigneeId: "collab-1", productionDueAt: new Date().toISOString() },
      })
    ).not.toThrow();
  });

  it("exige comentário para solicitar alterações", () => {
    const c = content({ stage: "aprovacao" });
    expect(() =>
      assertTransition({ action: "solicitar_alteracoes", content: c, actor: admin, hasActiveApproval: false })
    ).toThrow(/alterado/);
  });

  it("exige aprovação, canal e data para agendar", () => {
    const c = content({ stage: "aprovacao" });
    expect(() =>
      assertTransition({ action: "agendar", content: c, actor: admin, hasActiveApproval: false })
    ).toThrow(/não está disponível/);

    expect(() =>
      assertTransition({
        action: "agendar",
        content: c,
        actor: admin,
        hasActiveApproval: true,
        hasChannel: false,
        payload: { plannedPublishAt: new Date().toISOString() },
      })
    ).toThrow(/canal/);

    expect(() =>
      assertTransition({
        action: "agendar",
        content: c,
        actor: admin,
        hasActiveApproval: true,
        hasChannel: true,
        payload: { plannedPublishAt: null },
      })
    ).toThrow(/data/);
  });

  it("bloqueia transição fora do estágio atual mesmo com payload completo", () => {
    const c = content({ stage: "planejamento" });
    expect(() =>
      assertTransition({ action: "confirmar_publicacao", content: c, actor: admin, hasActiveApproval: false })
    ).toThrow(/não está disponível/);
  });

  it("exige justificativa para reabrir e bloqueia quem não gerencia", () => {
    const c = content({ stage: "publicado" });
    expect(() =>
      assertTransition({ action: "reabrir", content: c, actor: admin, hasActiveApproval: true })
    ).toThrow(/justificativa/);

    expect(() =>
      assertTransition({
        action: "reabrir",
        content: c,
        actor: admin,
        hasActiveApproval: true,
        payload: { reason: "Erro de digitação na legenda" },
      })
    ).not.toThrow();
  });
});

describe("changeInvalidatesApproval", () => {
  it("legenda, canais e materiais publicáveis invalidam", () => {
    expect(changeInvalidatesApproval(["caption"])).toBe(true);
    expect(changeInvalidatesApproval(["channels"])).toBe(true);
    expect(changeInvalidatesApproval(["publishable_attachments"])).toBe(true);
  });

  it("título, comentários e referências internas não invalidam", () => {
    expect(changeInvalidatesApproval(["title"])).toBe(false);
    expect(changeInvalidatesApproval(["reference_links"])).toBe(false);
    expect(changeInvalidatesApproval([])).toBe(false);
  });
});

describe("isProductionOverdue / isPublicationOverdue", () => {
  const now = new Date("2026-01-10T12:00:00Z");

  it("atrasado quando prazo de produção passou e ainda não foi aprovado/agendado/publicado", () => {
    expect(
      isProductionOverdue(
        { stage: "criacao", productionDueAt: "2026-01-09T12:00:00Z", archivedAt: null },
        now
      )
    ).toBe(true);
  });

  it("não é atrasado se já está aprovado, agendado ou publicado", () => {
    expect(
      isProductionOverdue({ stage: "aprovacao", productionDueAt: "2026-01-01T00:00:00Z", archivedAt: null }, now)
    ).toBe(false);
  });

  it("publicação atrasada quando a data planejada passou sem confirmação", () => {
    expect(
      isPublicationOverdue({ stage: "agendado", plannedPublishAt: "2026-01-09T12:00:00Z", archivedAt: null }, now)
    ).toBe(true);
    expect(
      isPublicationOverdue({ stage: "publicado", plannedPublishAt: "2026-01-01T00:00:00Z", archivedAt: null }, now)
    ).toBe(false);
  });

  it("conteúdo arquivado nunca conta como atrasado", () => {
    expect(
      isProductionOverdue(
        { stage: "criacao", productionDueAt: "2020-01-01T00:00:00Z", archivedAt: "2026-01-01T00:00:00Z" },
        now
      )
    ).toBe(false);
  });
});

describe("wouldRemoveLastAdmin", () => {
  it("detecta quando rebaixar/remover deixaria a igreja sem administrador", () => {
    const memberships = [
      { userId: "u1", role: "admin" as const },
      { userId: "u2", role: "collaborator" as const },
    ];
    expect(wouldRemoveLastAdmin(memberships, "u1", "remove")).toBe(true);
    expect(wouldRemoveLastAdmin(memberships, "u1", "collaborator")).toBe(true);
    expect(wouldRemoveLastAdmin(memberships, "u1", "admin")).toBe(false);
  });

  it("permite remover/rebaixar um admin quando existe outro", () => {
    const memberships = [
      { userId: "u1", role: "admin" as const },
      { userId: "u2", role: "admin" as const },
    ];
    expect(wouldRemoveLastAdmin(memberships, "u1", "remove")).toBe(false);
  });

  it("não afeta usuários que não são admin", () => {
    const memberships = [
      { userId: "u1", role: "admin" as const },
      { userId: "u2", role: "collaborator" as const },
    ];
    expect(wouldRemoveLastAdmin(memberships, "u2", "remove")).toBe(false);
  });
});
