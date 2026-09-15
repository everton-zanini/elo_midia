-- Elo Mídia — operações transacionais do fluxo de produção e de convites.
-- Cada função revalida papel/estágio no servidor, mesmo quando o cliente já
-- desabilita a ação na interface, para nunca depender apenas do front-end.

create or replace function public.check_version(p_content_id uuid, p_expected_version integer, p_current_version integer)
returns void
language plpgsql
as $$
begin
  if p_expected_version is not null and p_expected_version <> p_current_version then
    raise exception 'Este conteúdo foi alterado por outra pessoa. Recarregue para ver a versão mais recente.'
      using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Aprovar
-- ---------------------------------------------------------------------------
create or replace function public.approve_content(p_content_id uuid, p_expected_version integer default null)
returns public.approvals
language plpgsql
security definer set search_path = public
as $$
declare
  v_content public.contents;
  v_channels jsonb;
  v_materials jsonb;
  v_approval public.approvals;
begin
  select * into v_content from public.contents where id = p_content_id;
  if v_content is null or not public.is_member(v_content.church_id) then
    raise exception 'Conteúdo não encontrado.' using errcode = 'P0001';
  end if;
  if not public.has_role(v_content.church_id, array['admin', 'coordinator']) then
    raise exception 'Apenas administradores e coordenadores podem aprovar.' using errcode = 'P0001';
  end if;
  if v_content.stage <> 'aprovacao' then
    raise exception 'Só é possível aprovar um conteúdo que está em Aprovação.' using errcode = 'P0001';
  end if;
  perform public.check_version(p_content_id, p_expected_version, v_content.version);

  select coalesce(jsonb_agg(channel order by channel), '[]'::jsonb) into v_channels
  from public.content_channels where content_id = p_content_id;

  select coalesce(jsonb_agg(file_name order by created_at), '[]'::jsonb) into v_materials
  from public.attachments where content_id = p_content_id and kind = 'publicavel';

  insert into public.approvals (content_id, church_id, approved_by, approved_version, snapshot)
  values (
    p_content_id,
    v_content.church_id,
    auth.uid(),
    v_content.version,
    jsonb_build_object(
      'title', v_content.title,
      'caption', v_content.caption,
      'channels', v_channels,
      'materials', v_materials
    )
  )
  returning * into v_approval;

  insert into public.activity_log (church_id, content_id, actor_id, action, metadata)
  values (v_content.church_id, p_content_id, auth.uid(), 'approved', jsonb_build_object('approved_version', v_content.version));

  return v_approval;
end;
$$;

-- ---------------------------------------------------------------------------
-- Solicitar alterações
-- ---------------------------------------------------------------------------
create or replace function public.request_changes(p_content_id uuid, p_comment text, p_expected_version integer default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_content public.contents;
begin
  select * into v_content from public.contents where id = p_content_id;
  if v_content is null or not public.is_member(v_content.church_id) then
    raise exception 'Conteúdo não encontrado.' using errcode = 'P0001';
  end if;
  if not public.has_role(v_content.church_id, array['admin', 'coordinator']) then
    raise exception 'Apenas administradores e coordenadores podem solicitar alterações.' using errcode = 'P0001';
  end if;
  if v_content.stage <> 'aprovacao' then
    raise exception 'Só é possível solicitar alterações em um conteúdo que está em Aprovação.' using errcode = 'P0001';
  end if;
  if p_comment is null or btrim(p_comment) = '' then
    raise exception 'Descreva o que precisa ser alterado.' using errcode = 'P0001';
  end if;
  perform public.check_version(p_content_id, p_expected_version, v_content.version);

  insert into public.comments (content_id, church_id, author_id, body)
  values (p_content_id, v_content.church_id, auth.uid(), p_comment);

  update public.contents set stage = 'criacao' where id = p_content_id;

  insert into public.activity_log (church_id, content_id, actor_id, action, metadata)
  values (v_content.church_id, p_content_id, auth.uid(), 'changes_requested', jsonb_build_object('comment', p_comment));
end;
$$;

-- ---------------------------------------------------------------------------
-- Agendar (requer aprovação ativa, ao menos um canal já definido e data
-- planejada). Os canais são escolhidos durante a Criação, via
-- content_channels — alterá-los depois de aprovado invalida a aprovação
-- (gatilho trg_content_channels_invalidate), por isso agendar não os altera.
-- ---------------------------------------------------------------------------
create or replace function public.schedule_content(
  p_content_id uuid,
  p_planned_publish_at timestamptz,
  p_expected_version integer default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_content public.contents;
  v_has_active_approval boolean;
  v_has_channel boolean;
begin
  select * into v_content from public.contents where id = p_content_id;
  if v_content is null or not public.is_member(v_content.church_id) then
    raise exception 'Conteúdo não encontrado.' using errcode = 'P0001';
  end if;
  if not public.has_role(v_content.church_id, array['admin', 'coordinator']) then
    raise exception 'Apenas administradores e coordenadores podem agendar.' using errcode = 'P0001';
  end if;
  if v_content.stage <> 'aprovacao' then
    raise exception 'Só é possível agendar um conteúdo em Aprovação e já aprovado.' using errcode = 'P0001';
  end if;
  select exists (
    select 1 from public.approvals a where a.content_id = p_content_id and a.invalidated_at is null
  ) into v_has_active_approval;
  if not v_has_active_approval then
    raise exception 'Aprove o conteúdo antes de agendar.' using errcode = 'P0001';
  end if;
  select exists (select 1 from public.content_channels where content_id = p_content_id) into v_has_channel;
  if not v_has_channel then
    raise exception 'Selecione ao menos um canal antes de agendar.' using errcode = 'P0001';
  end if;
  if p_planned_publish_at is null then
    raise exception 'Defina a data e o horário planejados de publicação.' using errcode = 'P0001';
  end if;
  perform public.check_version(p_content_id, p_expected_version, v_content.version);

  update public.contents
    set stage = 'agendado', planned_publish_at = p_planned_publish_at
    where id = p_content_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Confirmar publicação
-- ---------------------------------------------------------------------------
create or replace function public.confirm_publication(
  p_content_id uuid,
  p_published_url text default null,
  p_expected_version integer default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_content public.contents;
begin
  select * into v_content from public.contents where id = p_content_id;
  if v_content is null or not public.is_member(v_content.church_id) then
    raise exception 'Conteúdo não encontrado.' using errcode = 'P0001';
  end if;
  if not public.has_role(v_content.church_id, array['admin', 'coordinator']) then
    raise exception 'Apenas administradores e coordenadores podem confirmar a publicação.' using errcode = 'P0001';
  end if;
  if v_content.stage <> 'agendado' then
    raise exception 'Só é possível confirmar a publicação de um conteúdo Agendado.' using errcode = 'P0001';
  end if;
  perform public.check_version(p_content_id, p_expected_version, v_content.version);

  update public.contents
    set stage = 'publicado',
        published_at = now(),
        published_by = auth.uid(),
        published_url = nullif(btrim(p_published_url), '')
    where id = p_content_id;

  insert into public.activity_log (church_id, content_id, actor_id, action, metadata)
  values (v_content.church_id, p_content_id, auth.uid(), 'published', jsonb_build_object('published_url', p_published_url));
end;
$$;

-- ---------------------------------------------------------------------------
-- Reabrir conteúdo publicado
-- ---------------------------------------------------------------------------
create or replace function public.reopen_content(
  p_content_id uuid,
  p_reason text,
  p_expected_version integer default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_content public.contents;
begin
  select * into v_content from public.contents where id = p_content_id;
  if v_content is null or not public.is_member(v_content.church_id) then
    raise exception 'Conteúdo não encontrado.' using errcode = 'P0001';
  end if;
  if not public.has_role(v_content.church_id, array['admin', 'coordinator']) then
    raise exception 'Apenas administradores e coordenadores podem reabrir um conteúdo publicado.' using errcode = 'P0001';
  end if;
  if v_content.stage <> 'publicado' then
    raise exception 'Só é possível reabrir um conteúdo publicado.' using errcode = 'P0001';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Informe a justificativa da reabertura.' using errcode = 'P0001';
  end if;
  perform public.check_version(p_content_id, p_expected_version, v_content.version);

  update public.approvals
    set invalidated_at = now(), invalidated_reason = 'Conteúdo reaberto: ' || p_reason
    where content_id = p_content_id and invalidated_at is null;

  update public.contents set stage = 'criacao' where id = p_content_id;

  insert into public.activity_log (church_id, content_id, actor_id, action, metadata)
  values (v_content.church_id, p_content_id, auth.uid(), 'reopened', jsonb_build_object('reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- Duplicar conteúdo (nova solicitação, sem aprovação/histórico/publicação)
-- ---------------------------------------------------------------------------
create or replace function public.duplicate_content(p_content_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_content public.contents;
  v_new_id uuid;
begin
  select * into v_content from public.contents where id = p_content_id;
  if v_content is null or not public.is_member(v_content.church_id) then
    raise exception 'Conteúdo não encontrado.' using errcode = 'P0001';
  end if;
  if not (
    public.has_role(v_content.church_id, array['admin', 'coordinator'])
    or v_content.assignee_id = auth.uid()
    or v_content.requester_id = auth.uid()
  ) then
    raise exception 'Você não tem permissão para duplicar este conteúdo.' using errcode = 'P0001';
  end if;

  insert into public.contents (
    church_id, title, description, ministry_id, content_type, requester_id,
    priority, caption, reference_links, duplicated_from
  ) values (
    v_content.church_id, v_content.title || ' (cópia)', v_content.description, v_content.ministry_id,
    v_content.content_type, auth.uid(), v_content.priority, v_content.caption, v_content.reference_links, v_content.id
  )
  returning id into v_new_id;

  insert into public.content_channels (content_id, church_id, channel)
  select v_new_id, v_content.church_id, channel from public.content_channels where content_id = p_content_id;

  insert into public.checklist_items (content_id, church_id, title, position)
  select v_new_id, v_content.church_id, title, position from public.checklist_items where content_id = p_content_id;

  return v_new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Convites: pré-visualização pública (por token) e aceite
-- ---------------------------------------------------------------------------
create or replace function public.get_invite_preview(p_token uuid)
returns table (church_name text, role text, email text, status text)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_invite public.invites;
  v_church_name text;
  v_status text;
begin
  select * into v_invite from public.invites where token = p_token;
  if v_invite is null then
    return query select null::text, null::text, null::text, 'not_found'::text;
    return;
  end if;

  select c.name into v_church_name from public.churches c where c.id = v_invite.church_id;

  if v_invite.revoked_at is not null then
    v_status := 'revoked';
  elsif v_invite.accepted_at is not null then
    v_status := 'accepted';
  elsif v_invite.expires_at < now() then
    v_status := 'expired';
  else
    v_status := 'valid';
  end if;

  return query select v_church_name, v_invite.role, v_invite.email, v_status;
end;
$$;

create or replace function public.accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite public.invites;
  v_user_email text;
  v_membership_id uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar autenticado para aceitar um convite.' using errcode = 'P0001';
  end if;

  select * into v_invite from public.invites where token = p_token for update;
  if v_invite is null then
    raise exception 'Convite não encontrado.' using errcode = 'P0001';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'Este convite foi revogado.' using errcode = 'P0001';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Este convite já foi utilizado.' using errcode = 'P0001';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Este convite expirou.' using errcode = 'P0001';
  end if;

  select email into v_user_email from public.profiles where id = auth.uid();
  if v_user_email is null or lower(v_user_email) <> lower(v_invite.email) then
    raise exception 'Este convite foi enviado para outro e-mail. Entre com a conta que recebeu o convite.'
      using errcode = 'P0001';
  end if;

  insert into public.memberships (church_id, user_id, role)
  values (v_invite.church_id, auth.uid(), v_invite.role)
  on conflict (church_id, user_id) do update set role = excluded.role
  returning id into v_membership_id;

  update public.invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;

  return v_membership_id;
end;
$$;

grant execute on function public.get_invite_preview(uuid) to anon, authenticated;
grant execute on function public.accept_invite(uuid) to authenticated;
