-- Elo Mídia — schema inicial
-- Convenção: todo dado de negócio pertence a uma igreja (church_id) e é isolado por RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Igrejas (organizações / tenants)
-- ---------------------------------------------------------------------------
create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.churches is 'Cada igreja é uma organização independente (tenant).';

-- ---------------------------------------------------------------------------
-- Perfis de usuário (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados públicos do usuário autenticado, espelhando auth.users.';

-- ---------------------------------------------------------------------------
-- Participações do usuário em igrejas (papel de acesso)
-- ---------------------------------------------------------------------------
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'coordinator', 'collaborator')),
  created_at timestamptz not null default now(),
  unique (church_id, user_id)
);

create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_church_id_idx on public.memberships (church_id);

-- ---------------------------------------------------------------------------
-- Convites
-- ---------------------------------------------------------------------------
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'coordinator', 'collaborator')),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invites_church_id_idx on public.invites (church_id);
create index if not exists invites_email_idx on public.invites (lower(email));

-- ---------------------------------------------------------------------------
-- Ministérios / áreas solicitantes
-- ---------------------------------------------------------------------------
create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (church_id, name)
);

create index if not exists ministries_church_id_idx on public.ministries (church_id);

-- ---------------------------------------------------------------------------
-- Conteúdos (núcleo do fluxo de produção)
-- ---------------------------------------------------------------------------
create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  title text not null,
  description text not null default '',
  ministry_id uuid references public.ministries (id) on delete set null,
  content_type text not null check (
    content_type in ('arte', 'carrossel', 'video', 'reels', 'stories', 'fotografia', 'texto', 'outro')
  ),
  requester_id uuid references public.profiles (id) on delete set null,
  assignee_id uuid references public.profiles (id) on delete set null,
  priority text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  stage text not null default 'solicitacao' check (
    stage in ('solicitacao', 'planejamento', 'criacao', 'aprovacao', 'agendado', 'publicado')
  ),
  production_due_at timestamptz,
  planned_publish_at timestamptz,
  caption text not null default '',
  reference_links jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  published_url text,
  published_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  duplicated_from uuid references public.contents (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contents_church_stage_idx on public.contents (church_id, stage);
create index if not exists contents_church_assignee_idx on public.contents (church_id, assignee_id);
create index if not exists contents_church_planned_publish_idx on public.contents (church_id, planned_publish_at);
create index if not exists contents_church_production_due_idx on public.contents (church_id, production_due_at);
create index if not exists contents_church_archived_idx on public.contents (church_id, archived_at);

-- ---------------------------------------------------------------------------
-- Canais de publicação de um conteúdo
-- ---------------------------------------------------------------------------
create table if not exists public.content_channels (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  channel text not null check (channel in ('instagram', 'facebook', 'youtube', 'whatsapp', 'site', 'outro')),
  created_at timestamptz not null default now(),
  unique (content_id, channel)
);

create index if not exists content_channels_content_id_idx on public.content_channels (content_id);

-- ---------------------------------------------------------------------------
-- Checklist de tarefas do conteúdo
-- ---------------------------------------------------------------------------
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklist_items_content_id_idx on public.checklist_items (content_id);

-- ---------------------------------------------------------------------------
-- Comentários
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_content_id_idx on public.comments (content_id);

-- ---------------------------------------------------------------------------
-- Anexos (arquivos no Storage ou links externos de referência)
-- ---------------------------------------------------------------------------
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('publicavel', 'referencia')),
  storage_path text,
  external_url text,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint attachments_source_check check (storage_path is not null or external_url is not null)
);

create index if not exists attachments_content_id_idx on public.attachments (content_id);

-- ---------------------------------------------------------------------------
-- Histórico de atividades
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  content_id uuid references public.contents (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_content_id_idx on public.activity_log (content_id, created_at desc);
create index if not exists activity_log_church_id_idx on public.activity_log (church_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Aprovações
-- ---------------------------------------------------------------------------
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_version integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  invalidated_at timestamptz,
  invalidated_reason text
);

create index if not exists approvals_content_id_idx on public.approvals (content_id, created_at desc);

-- Garante no máximo uma aprovação "ativa" (não invalidada) por conteúdo.
create unique index if not exists approvals_active_unique
  on public.approvals (content_id)
  where invalidated_at is null;
