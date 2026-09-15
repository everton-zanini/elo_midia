-- Elo Mídia — trava o grafo de transições de estágio no banco, para que nem um
-- administrador consiga pular etapas (ex.: ir direto de Solicitação para
-- Publicado) por uma chamada direta à API, contornando o Kanban/Server Actions.
--
-- As funções de negócio (approve_content, request_changes, schedule_content,
-- confirm_publication, reopen_content) são SECURITY DEFINER: elas ignoram as
-- políticas de RLS, mas os gatilhos de tabela continuam valendo sempre — por
-- isso todas as transições que elas realizam também precisam estar aqui.

create or replace function public.contents_enforce_transition_graph()
returns trigger
language plpgsql
as $$
declare
  v_allowed boolean;
begin
  if new.stage = old.stage then
    return new;
  end if;

  v_allowed := (old.stage, new.stage) in (
    ('solicitacao', 'planejamento'),
    ('solicitacao', 'criacao'),
    ('planejamento', 'criacao'),
    ('criacao', 'aprovacao'),
    ('aprovacao', 'criacao'),
    ('aprovacao', 'agendado'),
    ('agendado', 'criacao'),
    ('agendado', 'publicado'),
    ('publicado', 'criacao')
  );

  if not v_allowed then
    raise exception 'Transição de estágio inválida: % → %.', old.stage, new.stage using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_contents_transition_graph on public.contents;
create trigger trg_contents_transition_graph
  before update of stage on public.contents
  for each row execute function public.contents_enforce_transition_graph();
