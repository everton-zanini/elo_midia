-- Elo Mídia — funções auxiliares, gatilhos e invariantes do fluxo de produção.
-- Todas as funções abaixo rodam como SECURITY INVOKER (padrão), respeitando o
-- contexto de auth.uid() e as políticas de RLS de quem chamou.

-- ---------------------------------------------------------------------------
-- profiles: criação automática ao registrar um usuário em auth.users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém profiles.email sincronizado quando o e-mail de auth.users muda.
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();

-- ---------------------------------------------------------------------------
-- Helpers de autorização (usados nas políticas de RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_member(p_church_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.church_id = p_church_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_role(p_church_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.church_id = p_church_id
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;

create or replace function public.current_role_in_church(p_church_id uuid)
returns text
language sql
stable
security definer set search_path = public
as $$
  select m.role from public.memberships m
  where m.church_id = p_church_id and m.user_id = auth.uid()
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Preenchimento automático de church_id em tabelas filhas de contents,
-- para impedir qualquer associação entre igrejas diferentes.
-- ---------------------------------------------------------------------------
create or replace function public.set_church_id_from_content()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.content_id is not null then
    select c.church_id into new.church_id from public.contents c where c.id = new.content_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_content_channels_church on public.content_channels;
create trigger trg_content_channels_church
  before insert or update of content_id on public.content_channels
  for each row execute function public.set_church_id_from_content();

drop trigger if exists trg_checklist_items_church on public.checklist_items;
create trigger trg_checklist_items_church
  before insert or update of content_id on public.checklist_items
  for each row execute function public.set_church_id_from_content();

drop trigger if exists trg_comments_church on public.comments;
create trigger trg_comments_church
  before insert or update of content_id on public.comments
  for each row execute function public.set_church_id_from_content();

drop trigger if exists trg_attachments_church on public.attachments;
create trigger trg_attachments_church
  before insert or update of content_id on public.attachments
  for each row execute function public.set_church_id_from_content();

drop trigger if exists trg_approvals_church on public.approvals;
create trigger trg_approvals_church
  before insert or update of content_id on public.approvals
  for each row execute function public.set_church_id_from_content();

-- activity_log permite content_id nulo (eventos de igreja); só ajusta quando houver conteúdo.
drop trigger if exists trg_activity_log_church on public.activity_log;
create trigger trg_activity_log_church
  before insert or update of content_id on public.activity_log
  for each row execute function public.set_church_id_from_content();

-- ---------------------------------------------------------------------------
-- contents: concorrência otimista (versão sobe a cada UPDATE)
-- ---------------------------------------------------------------------------
create or replace function public.contents_bump_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_contents_bump_version on public.contents;
create trigger trg_contents_bump_version
  before update on public.contents
  for each row execute function public.contents_bump_version();

-- ---------------------------------------------------------------------------
-- contents: exigências para entrar em "criação" e em "agendado"
-- ---------------------------------------------------------------------------
create or replace function public.contents_enforce_stage_requirements()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_has_channel boolean;
  v_has_active_approval boolean;
begin
  if new.stage = 'criacao' and old.stage <> 'criacao' then
    if new.assignee_id is null or new.production_due_at is null then
      raise exception 'Para entrar em Criação é preciso responsável principal e prazo de produção.'
        using errcode = 'P0001';
    end if;
  end if;

  if new.stage = 'agendado' and old.stage <> 'agendado' then
    select exists (
      select 1 from public.approvals a
      where a.content_id = new.id and a.invalidated_at is null
    ) into v_has_active_approval;

    select exists (
      select 1 from public.content_channels cc where cc.content_id = new.id
    ) into v_has_channel;

    if not v_has_active_approval then
      raise exception 'Só é possível agendar um conteúdo aprovado.' using errcode = 'P0001';
    end if;
    if not v_has_channel then
      raise exception 'Selecione ao menos um canal antes de agendar.' using errcode = 'P0001';
    end if;
    if new.planned_publish_at is null then
      raise exception 'Defina a data e o horário planejados de publicação antes de agendar.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_contents_stage_requirements on public.contents;
create trigger trg_contents_stage_requirements
  before update of stage on public.contents
  for each row execute function public.contents_enforce_stage_requirements();

-- ---------------------------------------------------------------------------
-- contents: proteção de conteúdo publicado contra edição comum
-- (a reabertura é feita por public.reopen_content, que move o estágio para
-- fora de "publicado" antes de liberar a edição)
-- ---------------------------------------------------------------------------
create or replace function public.contents_protect_published()
returns trigger
language plpgsql
as $$
begin
  if old.stage = 'publicado' and new.stage = 'publicado' then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.caption is distinct from old.caption
      or new.content_type is distinct from old.content_type
      or new.priority is distinct from old.priority
      or new.ministry_id is distinct from old.ministry_id
      or new.assignee_id is distinct from old.assignee_id
      or new.production_due_at is distinct from old.production_due_at
      or new.planned_publish_at is distinct from old.planned_publish_at
      or new.reference_links is distinct from old.reference_links
    then
      raise exception 'Conteúdo publicado está protegido. Reabra o conteúdo para corrigi-lo.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contents_protect_published on public.contents;
create trigger trg_contents_protect_published
  before update on public.contents
  for each row execute function public.contents_protect_published();

-- ---------------------------------------------------------------------------
-- contents: mudanças relevantes (legenda) invalidam aprovação ativa
-- ---------------------------------------------------------------------------
create or replace function public.contents_invalidate_on_caption_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.caption is distinct from old.caption and old.stage in ('aprovacao', 'agendado') then
    update public.approvals
      set invalidated_at = now(), invalidated_reason = 'Legenda alterada'
      where content_id = new.id and invalidated_at is null;
    new.stage := 'criacao';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contents_invalidate_caption on public.contents;
create trigger trg_contents_invalidate_caption
  before update of caption on public.contents
  for each row execute function public.contents_invalidate_on_caption_change();

-- ---------------------------------------------------------------------------
-- content_channels / attachments (material publicável): alterá-los invalida
-- aprovação ativa e bloqueia edição em conteúdo publicado.
-- ---------------------------------------------------------------------------
create or replace function public.invalidate_approval_for_content(p_content_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_stage text;
begin
  select stage into v_stage from public.contents where id = p_content_id;

  if v_stage = 'publicado' then
    raise exception 'Conteúdo publicado está protegido. Reabra o conteúdo para corrigi-lo.'
      using errcode = 'P0001';
  end if;

  if v_stage in ('aprovacao', 'agendado') then
    update public.approvals
      set invalidated_at = now(), invalidated_reason = p_reason
      where content_id = p_content_id and invalidated_at is null;

    update public.contents set stage = 'criacao' where id = p_content_id;
  end if;
end;
$$;

create or replace function public.content_channels_invalidate()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.invalidate_approval_for_content(coalesce(new.content_id, old.content_id), 'Canais de publicação alterados');
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_content_channels_invalidate on public.content_channels;
create trigger trg_content_channels_invalidate
  after insert or delete on public.content_channels
  for each row execute function public.content_channels_invalidate();

create or replace function public.attachments_invalidate()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(new.kind, old.kind) = 'publicavel' then
    perform public.invalidate_approval_for_content(coalesce(new.content_id, old.content_id), 'Materiais publicáveis alterados');
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_attachments_invalidate on public.attachments;
create trigger trg_attachments_invalidate
  after insert or delete on public.attachments
  for each row execute function public.attachments_invalidate();

-- ---------------------------------------------------------------------------
-- contents: histórico automático de mudança de estágio
-- ---------------------------------------------------------------------------
create or replace function public.contents_log_stage_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.activity_log (church_id, content_id, actor_id, action, metadata)
    values (
      new.church_id,
      new.id,
      auth.uid(),
      'stage_changed',
      jsonb_build_object('from', old.stage, 'to', new.stage)
    );
  end if;

  if new.planned_publish_at is distinct from old.planned_publish_at then
    insert into public.activity_log (church_id, content_id, actor_id, action, metadata)
    values (
      new.church_id,
      new.id,
      auth.uid(),
      'planned_publish_at_changed',
      jsonb_build_object('from', old.planned_publish_at, 'to', new.planned_publish_at)
    );
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    insert into public.activity_log (church_id, content_id, actor_id, action, metadata)
    values (
      new.church_id,
      new.id,
      auth.uid(),
      'assignee_changed',
      jsonb_build_object('from', old.assignee_id, 'to', new.assignee_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_contents_log_changes on public.contents;
create trigger trg_contents_log_changes
  after update on public.contents
  for each row execute function public.contents_log_stage_change();

create or replace function public.contents_log_creation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.activity_log (church_id, content_id, actor_id, action, metadata)
  values (new.church_id, new.id, auth.uid(), 'content_created', jsonb_build_object('title', new.title));
  return new;
end;
$$;

drop trigger if exists trg_contents_log_creation on public.contents;
create trigger trg_contents_log_creation
  after insert on public.contents
  for each row execute function public.contents_log_creation();

-- ---------------------------------------------------------------------------
-- memberships: protege o último administrador da igreja
-- ---------------------------------------------------------------------------
create or replace function public.memberships_protect_last_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_church_id uuid;
  v_other_admins integer;
begin
  v_church_id := old.church_id;

  if tg_op = 'DELETE' and old.role <> 'admin' then
    return old;
  end if;
  if tg_op = 'UPDATE' and old.role <> 'admin' then
    return new;
  end if;

  select count(*) into v_other_admins
  from public.memberships
  where church_id = v_church_id and role = 'admin' and id <> old.id;

  if v_other_admins = 0 then
    if tg_op = 'DELETE' then
      raise exception 'Não é possível remover o último administrador da igreja.' using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' and new.role <> 'admin' then
      raise exception 'Não é possível rebaixar o último administrador da igreja.' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_memberships_protect_last_admin on public.memberships;
create trigger trg_memberships_protect_last_admin
  before update or delete on public.memberships
  for each row execute function public.memberships_protect_last_admin();

-- ---------------------------------------------------------------------------
-- checklist_items: bloqueia edição quando o conteúdo está publicado
-- ---------------------------------------------------------------------------
create or replace function public.checklist_items_protect_published()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_stage text;
begin
  select stage into v_stage from public.contents where id = coalesce(new.content_id, old.content_id);
  if v_stage = 'publicado' then
    raise exception 'Conteúdo publicado está protegido. Reabra o conteúdo para editar o checklist.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_checklist_items_protect_published on public.checklist_items;
create trigger trg_checklist_items_protect_published
  before insert or update or delete on public.checklist_items
  for each row execute function public.checklist_items_protect_published();
