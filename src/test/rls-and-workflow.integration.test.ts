import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CHURCH_1,
  CHURCH_2,
  USERS,
  adminClient,
  anonClient,
  createConfirmedUser,
  deleteUser,
  signedInClient,
} from "./helpers";

/**
 * Testes de integração contra um Supabase local real (migrations + RLS +
 * gatilhos + funções). Rodam com `npm run test:integration` (requer
 * `npx supabase start`). Cobrem exatamente os itens de risco listados na
 * seção 14 do briefing: isolamento entre igrejas, acesso direto a registros
 * de outra igreja, permissões por papel, convites, transições do fluxo,
 * invalidação de aprovação e proteção do último administrador.
 */

let admin: Awaited<ReturnType<typeof signedInClient>>;
let coordinator: Awaited<ReturnType<typeof signedInClient>>;
let collaborator: Awaited<ReturnType<typeof signedInClient>>;
let admin2: Awaited<ReturnType<typeof signedInClient>>;

beforeAll(async () => {
  admin = await signedInClient(USERS.admin.email);
  coordinator = await signedInClient(USERS.coordinator.email);
  collaborator = await signedInClient(USERS.collaborator.email);
  admin2 = await signedInClient(USERS.admin2.email);
});

async function createDraftContent(client: typeof admin, church_id: string, title: string) {
  const { data, error } = await client
    .from("contents")
    .insert({ church_id, title, content_type: "arte" })
    .select()
    .single();
  if (error) throw error;
  return data!;
}

describe("Isolamento entre igrejas", () => {
  it("um membro da Igreja Modelo não enxerga conteúdos da Segunda Igreja", async () => {
    const { data } = await admin.from("contents").select("id, church_id").eq("church_id", CHURCH_2);
    expect(data).toEqual([]);
  });

  it("um membro da Segunda Igreja não enxerga ministérios da Igreja Modelo", async () => {
    const { data } = await admin2.from("ministries").select("id").eq("church_id", CHURCH_1);
    expect(data).toEqual([]);
  });

  it("acesso direto por id a um conteúdo de outra igreja retorna vazio, não um erro revelador", async () => {
    const content = await createDraftContent(admin2, CHURCH_2, "Conteúdo privado da Segunda Igreja");
    const { data, error } = await admin.from("contents").select("*").eq("id", content.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("não é possível atualizar um conteúdo de outra igreja (0 linhas afetadas)", async () => {
    const content = await createDraftContent(admin2, CHURCH_2, "Outro conteúdo da Segunda Igreja");
    const { data } = await admin.from("contents").update({ title: "Invadido" }).eq("id", content.id).select();
    expect(data).toEqual([]);

    const check = adminClient();
    const { data: unchanged } = await check.from("contents").select("title").eq("id", content.id).single();
    expect(unchanged?.title).toBe("Outro conteúdo da Segunda Igreja");
  });

  it("não é possível anexar um canal a um conteúdo de outra igreja", async () => {
    const content = await createDraftContent(admin2, CHURCH_2, "Conteúdo com canal protegido");
    const { error } = await admin
      .from("content_channels")
      .insert({ content_id: content.id, church_id: CHURCH_2, channel: "instagram" });
    expect(error).not.toBeNull();
  });
});

describe("Permissões por papel", () => {
  it("colaborador não cria ministério", async () => {
    const { error } = await collaborator.from("ministries").insert({ church_id: CHURCH_1, name: "Ministério Fantasma" });
    expect(error).not.toBeNull();
  });

  it("colaborador não cria convite", async () => {
    const { error } = await collaborator.from("invites").insert({
      church_id: CHURCH_1,
      email: "alguem@example.com",
      role: "collaborator",
      invited_by: USERS.collaborator.id,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("colaborador cria uma solicitação normalmente", async () => {
    const content = await createDraftContent(collaborator, CHURCH_1, "Solicitação criada por colaborador");
    expect(content.stage).toBe("solicitacao");
    expect(content.requester_id).toBe(USERS.collaborator.id);
  });

  it("coordenador não atualiza configurações da igreja", async () => {
    const { data } = await coordinator.from("churches").update({ name: "Nome hackeado" }).eq("id", CHURCH_1).select();
    expect(data).toEqual([]);
  });

  it("coordenador consegue enviar uma solicitação para planejamento", async () => {
    const content = await createDraftContent(coordinator, CHURCH_1, "Solicitação para planejamento");
    const { data, error } = await coordinator
      .from("contents")
      .update({ stage: "planejamento" })
      .eq("id", content.id)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.stage).toBe("planejamento");
  });

  it("colaborador não consegue editar conteúdo de outro colaborador em Criação", async () => {
    const content = await createDraftContent(admin, CHURCH_1, "Criação de outra pessoa");
    await admin
      .from("contents")
      .update({ stage: "criacao", assignee_id: USERS.coordinator.id, production_due_at: new Date().toISOString() })
      .eq("id", content.id);

    const { data } = await collaborator.from("contents").update({ caption: "Tentativa indevida" }).eq("id", content.id).select();
    expect(data).toEqual([]);
  });
});

describe("Convites", () => {
  it("convite expirado não pode ser aceito", async () => {
    const { data: invite } = await admin
      .from("invites")
      .insert({
        church_id: CHURCH_1,
        email: "expirado@example.com",
        role: "collaborator",
        invited_by: USERS.admin.id,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .select()
      .single();

    const user = await createConfirmedUser("expirado@example.com");
    const client = await signedInClient("expirado@example.com");
    const { error } = await client.rpc("accept_invite", { p_token: invite!.token });
    expect(error?.message).toMatch(/expirou/);
    await deleteUser(user.id);
  });

  it("convite revogado não pode ser aceito", async () => {
    const { data: invite } = await admin
      .from("invites")
      .insert({
        church_id: CHURCH_1,
        email: "revogado@example.com",
        role: "collaborator",
        invited_by: USERS.admin.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select()
      .single();
    await admin.from("invites").update({ revoked_at: new Date().toISOString() }).eq("id", invite!.id);

    const user = await createConfirmedUser("revogado@example.com");
    const client = await signedInClient("revogado@example.com");
    const { error } = await client.rpc("accept_invite", { p_token: invite!.token });
    expect(error?.message).toMatch(/revogado/);
    await deleteUser(user.id);
  });

  it("convite só pode ser usado uma vez", async () => {
    const { data: invite } = await admin
      .from("invites")
      .insert({
        church_id: CHURCH_1,
        email: "unico@example.com",
        role: "collaborator",
        invited_by: USERS.admin.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select()
      .single();

    const user = await createConfirmedUser("unico@example.com");
    const client = await signedInClient("unico@example.com");
    const first = await client.rpc("accept_invite", { p_token: invite!.token });
    expect(first.error).toBeNull();

    const second = await client.rpc("accept_invite", { p_token: invite!.token });
    expect(second.error?.message).toMatch(/já foi utilizado/);
    await deleteUser(user.id);
  });

  it("convite só pode ser aceito pelo e-mail convidado", async () => {
    const { data: invite } = await admin
      .from("invites")
      .insert({
        church_id: CHURCH_1,
        email: "convidado-certo@example.com",
        role: "collaborator",
        invited_by: USERS.admin.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select()
      .single();

    // admin2 está autenticado, mas com outro e-mail
    const { error } = await admin2.rpc("accept_invite", { p_token: invite!.token });
    expect(error?.message).toMatch(/outro e-mail/);
  });

  it("pré-visualização pública funciona sem autenticação e não vaza convites de outra igreja por engano", async () => {
    const { data: invite } = await admin
      .from("invites")
      .insert({
        church_id: CHURCH_1,
        email: "preview@example.com",
        role: "coordinator",
        invited_by: USERS.admin.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select()
      .single();

    const anon = anonClient();
    const { data, error } = await anon.rpc("get_invite_preview", { p_token: invite!.token });
    expect(error).toBeNull();
    expect(data?.[0]?.status).toBe("valid");
    expect(data?.[0]?.church_name).toBe("Igreja Modelo");
  });
});

describe("Fluxo de produção e invalidação de aprovação", () => {
  it("percorre solicitação → planejamento → criação → aprovação → agendado → publicado", async () => {
    const content = await createDraftContent(collaborator, CHURCH_1, "Fluxo completo de teste");

    await admin.from("contents").update({ stage: "planejamento" }).eq("id", content.id);

    const dueDate = new Date(Date.now() + 86400000).toISOString();
    const { data: inCreation } = await admin
      .from("contents")
      .update({ stage: "criacao", assignee_id: USERS.collaborator.id, production_due_at: dueDate })
      .eq("id", content.id)
      .select()
      .single();
    expect(inCreation?.stage).toBe("criacao");

    await collaborator.from("content_channels").insert({ content_id: content.id, church_id: CHURCH_1, channel: "instagram" });

    const { data: inApproval, error: approvalMoveError } = await collaborator
      .from("contents")
      .update({ stage: "aprovacao" })
      .eq("id", content.id)
      .select()
      .single();
    expect(approvalMoveError).toBeNull();
    expect(inApproval?.stage).toBe("aprovacao");

    const { error: approveError } = await admin.rpc("approve_content", { p_content_id: content.id });
    expect(approveError).toBeNull();

    const plannedAt = new Date(Date.now() + 3 * 86400000).toISOString();
    const { error: scheduleError } = await admin.rpc("schedule_content", {
      p_content_id: content.id,
      p_planned_publish_at: plannedAt,
    });
    expect(scheduleError).toBeNull();

    const { error: confirmError } = await admin.rpc("confirm_publication", {
      p_content_id: content.id,
      p_published_url: "https://instagram.com/p/teste",
    });
    expect(confirmError).toBeNull();

    const { data: final } = await adminClient().from("contents").select("*").eq("id", content.id).single();
    expect(final?.stage).toBe("publicado");
    expect(final?.published_url).toBe("https://instagram.com/p/teste");
  });

  it("não permite pular direto de solicitação para publicado", async () => {
    const content = await createDraftContent(admin, CHURCH_1, "Tentativa de pular etapas");
    const { error } = await admin.from("contents").update({ stage: "publicado" }).eq("id", content.id);
    expect(error).not.toBeNull();
  });

  it("alterar a legenda depois de aprovado invalida a aprovação e devolve para Criação", async () => {
    const content = await createDraftContent(admin, CHURCH_1, "Conteúdo para invalidar por legenda");
    await admin
      .from("contents")
      .update({ stage: "criacao", assignee_id: USERS.admin.id, production_due_at: new Date().toISOString() })
      .eq("id", content.id);
    await admin.from("contents").update({ stage: "aprovacao" }).eq("id", content.id);
    await admin.rpc("approve_content", { p_content_id: content.id });

    await admin.from("contents").update({ caption: "Legenda nova depois da aprovação" }).eq("id", content.id);

    const { data: reverted } = await adminClient().from("contents").select("stage").eq("id", content.id).single();
    expect(reverted?.stage).toBe("criacao");

    const { data: approvals } = await adminClient().from("approvals").select("invalidated_at").eq("content_id", content.id);
    expect(approvals?.every((a) => a.invalidated_at !== null)).toBe(true);
  });

  it("alterar apenas a data planejada não invalida a aprovação", async () => {
    const content = await createDraftContent(admin, CHURCH_1, "Conteúdo para reagendar data");
    await admin
      .from("contents")
      .update({ stage: "criacao", assignee_id: USERS.admin.id, production_due_at: new Date().toISOString() })
      .eq("id", content.id);
    await admin.from("contents").update({ stage: "aprovacao" }).eq("id", content.id);
    await admin.rpc("approve_content", { p_content_id: content.id });

    const newDate = new Date(Date.now() + 5 * 86400000).toISOString();
    await admin.from("contents").update({ planned_publish_at: newDate }).eq("id", content.id);

    const { data: stillApproved } = await adminClient()
      .from("approvals")
      .select("invalidated_at")
      .eq("content_id", content.id)
      .is("invalidated_at", null);
    expect(stillApproved?.length).toBe(1);
  });

  it("conteúdo publicado é protegido; reabertura com justificativa libera edição", async () => {
    const content = await createDraftContent(admin, CHURCH_1, "Conteúdo para reabrir");
    await admin
      .from("contents")
      .update({ stage: "criacao", assignee_id: USERS.admin.id, production_due_at: new Date().toISOString() })
      .eq("id", content.id);
    await admin.from("content_channels").insert({ content_id: content.id, church_id: CHURCH_1, channel: "site" });
    await admin.from("contents").update({ stage: "aprovacao" }).eq("id", content.id);
    await admin.rpc("approve_content", { p_content_id: content.id });
    await admin.rpc("schedule_content", {
      p_content_id: content.id,
      p_planned_publish_at: new Date(Date.now() + 86400000).toISOString(),
    });
    await admin.rpc("confirm_publication", { p_content_id: content.id });

    const { error: blockedEdit } = await admin.from("contents").update({ title: "Editado sem reabrir" }).eq("id", content.id);
    expect(blockedEdit).not.toBeNull();

    const { error: reopenError } = await admin.rpc("reopen_content", {
      p_content_id: content.id,
      p_reason: "Corrigir erro de digitação",
    });
    expect(reopenError).toBeNull();

    const { error: nowAllowed } = await admin.from("contents").update({ title: "Editado depois de reaberto" }).eq("id", content.id);
    expect(nowAllowed).toBeNull();
  });
});

describe("Concorrência otimista", () => {
  it("rejeita uma ação com versão desatualizada", async () => {
    const content = await createDraftContent(admin, CHURCH_1, "Conteúdo para teste de versão");
    await admin
      .from("contents")
      .update({ stage: "criacao", assignee_id: USERS.admin.id, production_due_at: new Date().toISOString() })
      .eq("id", content.id);
    const staleVersion = content.version;
    await admin.from("contents").update({ stage: "aprovacao" }).eq("id", content.id);

    const { error } = await admin.rpc("approve_content", {
      p_content_id: content.id,
      p_expected_version: staleVersion,
    });
    expect(error?.message).toMatch(/outra pessoa/);
  });
});

describe("Proteção do último administrador", () => {
  it("não permite remover o único administrador da igreja", async () => {
    const { data: membership } = await admin2.from("memberships").select("id").eq("church_id", CHURCH_2).eq("user_id", USERS.admin2.id).single();
    const { error } = await admin2.from("memberships").delete().eq("id", membership!.id);
    expect(error).not.toBeNull();
  });

  it("não permite rebaixar o único administrador", async () => {
    const { data: membership } = await admin2.from("memberships").select("id").eq("church_id", CHURCH_2).eq("user_id", USERS.admin2.id).single();
    const { error } = await admin2.from("memberships").update({ role: "collaborator" }).eq("id", membership!.id);
    expect(error).not.toBeNull();
  });

  it("permite remover um administrador quando existe outro", async () => {
    const svc = adminClient();
    const { data: extraMembership } = await svc
      .from("memberships")
      .insert({ church_id: CHURCH_2, user_id: USERS.admin.id, role: "admin" })
      .select()
      .single();

    const { error } = await admin2.from("memberships").delete().eq("id", extraMembership!.id);
    expect(error).toBeNull();
  });
});

afterAll(async () => {
  await admin.auth.signOut();
  await coordinator.auth.signOut();
  await collaborator.auth.signOut();
  await admin2.auth.signOut();
});
