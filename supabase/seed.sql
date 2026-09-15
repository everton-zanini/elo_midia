-- Elo Mídia — dados de demonstração (OPCIONAIS).
--
-- Este arquivo só roda em ambiente LOCAL, via `npx supabase db reset` (ou
-- `npx supabase start` na primeira vez). Ele NUNCA é executado em produção:
-- deploys usam apenas os arquivos em supabase/migrations, e este seed.sql
-- fica de fora do pipeline de deploy.
--
-- Cria duas igrejas de demonstração (para evidenciar o isolamento entre
-- igrejas) e conteúdos cobrindo todas as etapas do fluxo. Usuários de teste:
--
--   admin@demo.elomidia.app        senha: DemoSenha123!   (Igreja Modelo, admin)
--   coordenador@demo.elomidia.app  senha: DemoSenha123!   (Igreja Modelo, coordenador)
--   colaborador@demo.elomidia.app  senha: DemoSenha123!   (Igreja Modelo, colaborador)
--   admin2@demo.elomidia.app       senha: DemoSenha123!   (Segunda Igreja, admin)

do $$
declare
  v_church1 uuid := '11111111-1111-4111-8111-111111111111';
  v_church2 uuid := '22222222-2222-4222-8222-222222222222';
  v_admin uuid := 'a1000000-0000-4000-8000-000000000001';
  v_coord uuid := 'a2000000-0000-4000-8000-000000000002';
  v_collab uuid := 'a3000000-0000-4000-8000-000000000003';
  v_admin2 uuid := 'a4000000-0000-4000-8000-000000000004';
  v_ministry_louvor uuid;
  v_ministry_infantil uuid;
  v_content_solicitacao uuid;
  v_content_planejamento uuid;
  v_content_criacao uuid;
  v_content_aprovacao uuid;
  v_content_agendado uuid;
  v_content_publicado uuid;
begin
  -- Igrejas
  insert into public.churches (id, name, slug, timezone) values
    (v_church1, 'Igreja Modelo', 'igreja-modelo', 'America/Sao_Paulo'),
    (v_church2, 'Segunda Igreja (isolamento)', 'segunda-igreja', 'America/Sao_Paulo')
  on conflict (id) do nothing;

  -- Usuários de demonstração
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated', 'admin@demo.elomidia.app', crypt('DemoSenha123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Administradora"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_coord, 'authenticated', 'authenticated', 'coordenador@demo.elomidia.app', crypt('DemoSenha123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Coordenador"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_collab, 'authenticated', 'authenticated', 'colaborador@demo.elomidia.app', crypt('DemoSenha123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bia Colaboradora"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_admin2, 'authenticated', 'authenticated', 'admin2@demo.elomidia.app', crypt('DemoSenha123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Duda da Segunda Igreja"}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), v_admin, v_admin::text, jsonb_build_object('sub', v_admin::text, 'email', 'admin@demo.elomidia.app'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_coord, v_coord::text, jsonb_build_object('sub', v_coord::text, 'email', 'coordenador@demo.elomidia.app'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_collab, v_collab::text, jsonb_build_object('sub', v_collab::text, 'email', 'colaborador@demo.elomidia.app'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_admin2, v_admin2::text, jsonb_build_object('sub', v_admin2::text, 'email', 'admin2@demo.elomidia.app'), 'email', now(), now(), now())
  on conflict (provider, provider_id) do nothing;

  -- profiles são criados automaticamente pelo gatilho on_auth_user_created

  insert into public.memberships (church_id, user_id, role) values
    (v_church1, v_admin, 'admin'),
    (v_church1, v_coord, 'coordinator'),
    (v_church1, v_collab, 'collaborator'),
    (v_church2, v_admin2, 'admin')
  on conflict (church_id, user_id) do nothing;

  insert into public.ministries (church_id, name) values
    (v_church1, 'Louvor'), (v_church1, 'Infantil'), (v_church1, 'Jovens'),
    (v_church2, 'Louvor')
  on conflict (church_id, name) do nothing;

  select id into v_ministry_louvor from public.ministries where church_id = v_church1 and name = 'Louvor';
  select id into v_ministry_infantil from public.ministries where church_id = v_church1 and name = 'Infantil';

  -- Conteúdo em Solicitação
  insert into public.contents (church_id, title, description, ministry_id, content_type, requester_id, priority)
  values (v_church1, 'Post de convite para o culto de jovens', 'Precisamos de uma arte convidando para o culto de sexta.', v_ministry_louvor, 'arte', v_collab, 'normal')
  returning id into v_content_solicitacao;

  -- Conteúdo em Planejamento
  insert into public.contents (church_id, title, description, ministry_id, content_type, requester_id, priority, stage)
  values (v_church1, 'Carrossel sobre a campanha do agasalho', 'Explicar como doar e pontos de coleta.', v_ministry_infantil, 'carrossel', v_admin, 'alta', 'solicitacao')
  returning id into v_content_planejamento;
  update public.contents set stage = 'planejamento' where id = v_content_planejamento;

  -- Conteúdo em Criação (com responsável e prazo)
  insert into public.contents (church_id, title, description, ministry_id, content_type, requester_id, priority, stage)
  values (v_church1, 'Reels dos bastidores do ensaio do louvor', 'Vídeo curto mostrando o ensaio de quinta.', v_ministry_louvor, 'reels', v_admin, 'normal', 'solicitacao')
  returning id into v_content_criacao;
  update public.contents set stage = 'planejamento' where id = v_content_criacao;
  update public.contents set stage = 'criacao', assignee_id = v_collab, production_due_at = now() + interval '2 days' where id = v_content_criacao;
  insert into public.checklist_items (content_id, church_id, title, position) values
    (v_content_criacao, v_church1, 'Selecionar melhores cenas', 1),
    (v_content_criacao, v_church1, 'Adicionar legenda', 2);
  insert into public.comments (content_id, church_id, author_id, body) values
    (v_content_criacao, v_church1, v_admin, 'Capricha na trilha sonora :)');

  -- Conteúdo em Aprovação (aprovado, aguardando agendamento)
  insert into public.contents (church_id, title, description, ministry_id, content_type, requester_id, priority, stage, caption)
  values (v_church1, 'Arte do versículo da semana', 'Arte simples com o versículo de Filipenses 4:13.', v_ministry_louvor, 'arte', v_admin, 'normal', 'solicitacao', 'Tudo posso naquele que me fortalece. #versiculodasemana')
  returning id into v_content_aprovacao;
  update public.contents set stage = 'planejamento' where id = v_content_aprovacao;
  update public.contents set stage = 'criacao', assignee_id = v_coord, production_due_at = now() + interval '1 day' where id = v_content_aprovacao;
  update public.contents set stage = 'aprovacao' where id = v_content_aprovacao;
  insert into public.approvals (content_id, church_id, approved_by, approved_version, snapshot)
  select v_content_aprovacao, v_church1, v_admin, version, jsonb_build_object('title', title, 'caption', caption)
  from public.contents where id = v_content_aprovacao;

  -- Conteúdo Agendado
  insert into public.contents (church_id, title, description, ministry_id, content_type, requester_id, priority, stage, caption, planned_publish_at)
  values (v_church1, 'Convite para a Escola Bíblica de Domingo', 'Arte convidando para a EBD deste domingo às 9h.', v_ministry_infantil, 'arte', v_admin, 'normal', 'solicitacao', 'Vem para a EBD! Domingo, 9h. 📖', now() + interval '3 days')
  returning id into v_content_agendado;
  update public.contents set stage = 'planejamento' where id = v_content_agendado;
  update public.contents set stage = 'criacao', assignee_id = v_collab, production_due_at = now() - interval '1 day' where id = v_content_agendado;
  insert into public.content_channels (content_id, church_id, channel) values (v_content_agendado, v_church1, 'instagram');
  update public.contents set stage = 'aprovacao' where id = v_content_agendado;
  insert into public.approvals (content_id, church_id, approved_by, approved_version, snapshot)
  select v_content_agendado, v_church1, v_admin, version, jsonb_build_object('title', title, 'caption', caption)
  from public.contents where id = v_content_agendado;
  update public.contents set stage = 'agendado' where id = v_content_agendado;

  -- Conteúdo Publicado
  insert into public.contents (church_id, title, description, ministry_id, content_type, requester_id, priority, stage, caption, planned_publish_at)
  values (v_church1, 'Recap do culto de celebração', 'Fotos do culto de domingo passado.', v_ministry_louvor, 'fotografia', v_admin, 'baixa', 'solicitacao', 'Que culto! Deus é fiel. 🙌', now() - interval '2 days')
  returning id into v_content_publicado;
  update public.contents set stage = 'planejamento' where id = v_content_publicado;
  update public.contents set stage = 'criacao', assignee_id = v_coord, production_due_at = now() - interval '3 days' where id = v_content_publicado;
  insert into public.content_channels (content_id, church_id, channel) values (v_content_publicado, v_church1, 'instagram');
  update public.contents set stage = 'aprovacao' where id = v_content_publicado;
  insert into public.approvals (content_id, church_id, approved_by, approved_version, snapshot)
  select v_content_publicado, v_church1, v_admin, version, jsonb_build_object('title', title, 'caption', caption)
  from public.contents where id = v_content_publicado;
  update public.contents set stage = 'agendado' where id = v_content_publicado;
  update public.contents set stage = 'publicado', published_at = now() - interval '2 days', published_by = v_admin, published_url = 'https://instagram.com/p/demo123'
  where id = v_content_publicado;

  -- Conteúdo isolado na Segunda Igreja, para testes de isolamento
  insert into public.contents (church_id, title, description, content_type, requester_id, priority)
  values (v_church2, 'Conteúdo exclusivo da Segunda Igreja', 'Não deve aparecer para membros da Igreja Modelo.', 'texto', v_admin2, 'normal');
end $$;
