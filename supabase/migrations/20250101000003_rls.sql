-- Elo Mídia — Row Level Security: isolamento entre igrejas e autorização por papel.
-- Toda tabela de negócio tem RLS habilitado. As políticas nunca confiam em um
-- church_id vindo do cliente sem checar a participação (membership) do usuário.

-- ---------------------------------------------------------------------------
-- Helpers adicionais de autorização usados nas políticas abaixo
-- ---------------------------------------------------------------------------
create or replace function public.can_edit_content(p_content_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.contents c
    where c.id = p_content_id
      and public.is_member(c.church_id)
      and (
        public.has_role(c.church_id, array['admin', 'coordinator'])
        or (c.assignee_id = auth.uid() and c.stage = 'criacao')
      )
  );
$$;

create or replace function public.can_view_content(p_content_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.contents c where c.id = p_content_id and public.is_member(c.church_id)
  );
$$;

-- Restringe arquivamento/desarquivamento a administrador e coordenador.
create or replace function public.contents_restrict_archive()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.archived_at is distinct from old.archived_at
     and not public.has_role(new.church_id, array['admin', 'coordinator']) then
    raise exception 'Apenas administradores e coordenadores podem arquivar ou restaurar conteúdos.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contents_restrict_archive on public.contents;
create trigger trg_contents_restrict_archive
  before update of archived_at on public.contents
  for each row execute function public.contents_restrict_archive();

-- Define valores seguros na criação de um conteúdo (ignora payload arbitrário do cliente).
create or replace function public.contents_before_insert_defaults()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.stage := 'solicitacao';
  new.requester_id := coalesce(new.requester_id, auth.uid());
  new.published_at := null;
  new.published_by := null;
  new.published_url := null;
  new.archived_at := null;
  new.version := 1;
  return new;
end;
$$;

drop trigger if exists trg_contents_before_insert_defaults on public.contents;
create trigger trg_contents_before_insert_defaults
  before insert on public.contents
  for each row execute function public.contents_before_insert_defaults();

-- ---------------------------------------------------------------------------
-- Habilita RLS
-- ---------------------------------------------------------------------------
alter table public.churches enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.ministries enable row level security;
alter table public.contents enable row level security;
alter table public.content_channels enable row level security;
alter table public.checklist_items enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_log enable row level security;
alter table public.approvals enable row level security;

-- ---------------------------------------------------------------------------
-- churches
-- ---------------------------------------------------------------------------
create policy churches_select on public.churches
  for select using (public.is_member(id));

create policy churches_update on public.churches
  for update using (public.has_role(id, array['admin']))
  with check (public.has_role(id, array['admin']));

-- (sem policy de insert/delete: criação de igreja é feita via service role, fora do app)

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.memberships mine
      join public.memberships theirs on theirs.church_id = mine.church_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
create policy memberships_select on public.memberships
  for select using (public.is_member(church_id));

create policy memberships_update_admin on public.memberships
  for update using (public.has_role(church_id, array['admin']))
  with check (public.has_role(church_id, array['admin']));

create policy memberships_delete_admin on public.memberships
  for delete using (public.has_role(church_id, array['admin']));

-- (sem policy de insert: participações nascem via aceite de convite, função com privilégio)

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------
create policy invites_select_admin on public.invites
  for select using (public.has_role(church_id, array['admin']));

create policy invites_insert_admin on public.invites
  for insert with check (
    public.has_role(church_id, array['admin']) and invited_by = auth.uid()
  );

create policy invites_update_admin on public.invites
  for update using (public.has_role(church_id, array['admin']))
  with check (public.has_role(church_id, array['admin']));

-- ---------------------------------------------------------------------------
-- ministries
-- ---------------------------------------------------------------------------
create policy ministries_select on public.ministries
  for select using (public.is_member(church_id));

create policy ministries_insert_admin on public.ministries
  for insert with check (public.has_role(church_id, array['admin']));

create policy ministries_update_admin on public.ministries
  for update using (public.has_role(church_id, array['admin']))
  with check (public.has_role(church_id, array['admin']));

create policy ministries_delete_admin on public.ministries
  for delete using (public.has_role(church_id, array['admin']));

-- ---------------------------------------------------------------------------
-- contents
-- ---------------------------------------------------------------------------
create policy contents_select on public.contents
  for select using (public.is_member(church_id));

create policy contents_insert on public.contents
  for insert with check (public.is_member(church_id));

-- Administrador/coordenador podem atualizar em qualquer estágio (exceto o que os
-- gatilhos bloquearem, ex.: conteúdo publicado). O responsável só pode atualizar
-- enquanto o conteúdo está em Criação, e só pode movê-lo para Criação ou Aprovação.
create policy contents_update on public.contents
  for update using (
    public.is_member(church_id)
    and (
      public.has_role(church_id, array['admin', 'coordinator'])
      or (assignee_id = auth.uid() and stage = 'criacao')
    )
  )
  with check (
    public.is_member(church_id)
    and (
      public.has_role(church_id, array['admin', 'coordinator'])
      or (assignee_id = auth.uid() and stage in ('criacao', 'aprovacao'))
    )
  );

-- ---------------------------------------------------------------------------
-- content_channels
-- ---------------------------------------------------------------------------
create policy content_channels_select on public.content_channels
  for select using (public.is_member(church_id));

create policy content_channels_insert on public.content_channels
  for insert with check (public.can_edit_content(content_id));

create policy content_channels_delete on public.content_channels
  for delete using (public.can_edit_content(content_id));

-- ---------------------------------------------------------------------------
-- checklist_items
-- ---------------------------------------------------------------------------
create policy checklist_items_select on public.checklist_items
  for select using (public.is_member(church_id));

create policy checklist_items_insert on public.checklist_items
  for insert with check (public.can_edit_content(content_id));

create policy checklist_items_update on public.checklist_items
  for update using (
    public.can_edit_content(content_id) or assignee_id = auth.uid()
  )
  with check (
    public.can_edit_content(content_id) or assignee_id = auth.uid()
  );

create policy checklist_items_delete on public.checklist_items
  for delete using (public.can_edit_content(content_id));

-- ---------------------------------------------------------------------------
-- comments (qualquer membro da igreja pode comentar; imutáveis após criados)
-- ---------------------------------------------------------------------------
create policy comments_select on public.comments
  for select using (public.is_member(church_id));

create policy comments_insert on public.comments
  for insert with check (public.can_view_content(content_id) and author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------
create policy attachments_select on public.attachments
  for select using (public.is_member(church_id));

create policy attachments_insert on public.attachments
  for insert with check (
    uploaded_by = auth.uid()
    and (
      (kind = 'referencia' and public.can_view_content(content_id))
      or (kind = 'publicavel' and public.can_edit_content(content_id))
    )
  );

create policy attachments_delete on public.attachments
  for delete using (
    uploaded_by = auth.uid()
    or public.can_edit_content(content_id)
  );

-- ---------------------------------------------------------------------------
-- activity_log (somente leitura pelo app; escrita é autoatribuída)
-- ---------------------------------------------------------------------------
create policy activity_log_select on public.activity_log
  for select using (public.is_member(church_id));

create policy activity_log_insert on public.activity_log
  for insert with check (public.is_member(church_id) and (actor_id = auth.uid() or actor_id is null));

-- ---------------------------------------------------------------------------
-- approvals (a criação passa por public.approve_content; aqui só a leitura)
-- ---------------------------------------------------------------------------
create policy approvals_select on public.approvals
  for select using (public.is_member(church_id));
