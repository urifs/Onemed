-- Playlists de estudo do aluno: espaço próprio onde ele junta cursos, aulas,
-- arquivos, flashcards, bancos de questões, cronogramas e materiais do acervo
-- público, com anotações. Cada aluno tem uma playlist padrão "Assistir depois".
--
-- Um item é (item_type, item_id) — não há FK por tipo (aponta para várias
-- tabelas); a RPC de resolução faz o join e o que sumiu vira "(removido)".

create table if not exists public.playlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  notes      text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists playlists_user_idx on public.playlists(user_id);

create table if not exists public.playlist_items (
  id          uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  item_type   text not null check (item_type in
                ('course','lesson','flashcard_deck','question_bank','study_plan','archive_item')),
  item_id     uuid not null,
  sort_order  int not null default 0,
  added_at    timestamptz not null default now(),
  unique (playlist_id, item_type, item_id)
);
create index if not exists playlist_items_playlist_idx on public.playlist_items(playlist_id);

alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;

-- Dono-only. auth.uid() dentro de (SELECT ...) vira InitPlan (1× por consulta).
drop policy if exists "playlists dono" on public.playlists;
create policy "playlists dono" on public.playlists
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "playlist_items dono" on public.playlist_items;
create policy "playlist_items dono" on public.playlist_items
  for all using (playlist_id in (select id from public.playlists where user_id = (select auth.uid())))
  with check (playlist_id in (select id from public.playlists where user_id = (select auth.uid())));

-- ── Lista as playlists do aluno, garantindo a "Assistir depois" padrão ──────
-- VOLATILE porque cria a padrão na primeira chamada. item_count já resolvido.
create or replace function public.my_playlists()
returns table(id uuid, name text, notes text, is_default boolean, item_count bigint, created_at timestamptz)
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if not exists (select 1 from public.playlists p where p.user_id = uid and p.is_default) then
    insert into public.playlists (user_id, name, is_default) values (uid, 'Assistir depois', true);
  end if;
  return query
    select p.id, p.name, p.notes, p.is_default,
           (select count(*) from public.playlist_items i where i.playlist_id = p.id) as item_count,
           p.created_at
    from public.playlists p
    where p.user_id = uid
    -- padrão primeiro, depois as mais recentes.
    order by p.is_default desc, p.created_at desc;
end $$;

-- ── Itens de uma playlist, com título e o necessário pra navegar ────────────
create or replace function public.playlist_items_resolved(_playlist_id uuid)
returns table(id uuid, item_type text, item_id uuid, title text, kind text,
              course_slug text, lesson_type text, added_at timestamptz)
language sql stable security definer set search_path = public as $$
  with it as (
    select i.* from public.playlist_items i
    join public.playlists p on p.id = i.playlist_id
    where i.playlist_id = _playlist_id and p.user_id = auth.uid()
  )
  select it.id, it.item_type, it.item_id,
    coalesce(c.title, l.title, fd.title, qb.title, sp.title, ai.title, '(item removido)') as title,
    case it.item_type
      when 'course'         then 'Curso'
      when 'lesson'         then case when l.type = 'video' then 'Aula' else 'Arquivo' end
      when 'flashcard_deck' then 'Flashcards'
      when 'question_bank'  then 'Banco de questões'
      when 'study_plan'     then 'Cronograma'
      when 'archive_item'   then 'Acervo Público'
    end as kind,
    coalesce(c.slug, lc.slug) as course_slug,
    l.type as lesson_type,
    it.added_at
  from it
  left join courses c         on it.item_type = 'course'         and c.id = it.item_id
  left join lessons l         on it.item_type = 'lesson'         and l.id = it.item_id
  left join courses lc        on it.item_type = 'lesson'         and lc.id = l.course_id
  left join flashcard_decks fd on it.item_type = 'flashcard_deck' and fd.id = it.item_id
  left join question_banks qb  on it.item_type = 'question_bank'  and qb.id = it.item_id
  left join study_plans sp     on it.item_type = 'study_plan'     and sp.id = it.item_id
  left join archive_items ai   on it.item_type = 'archive_item'   and ai.id = it.item_id
  order by it.added_at desc;
$$;

-- ── Mutações (dono verificado dentro de cada função) ────────────────────────
create or replace function public.playlist_create(_name text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); nid uuid;
begin
  if uid is null then raise exception 'não autenticado'; end if;
  insert into public.playlists (user_id, name)
    values (uid, coalesce(nullif(trim(_name), ''), 'Nova playlist'))
    returning id into nid;
  return nid;
end $$;

create or replace function public.playlist_add(_playlist_id uuid, _item_type text, _item_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not exists (select 1 from public.playlists where id = _playlist_id and user_id = auth.uid()) then
    raise exception 'playlist não encontrada';
  end if;
  insert into public.playlist_items (playlist_id, item_type, item_id)
    values (_playlist_id, _item_type, _item_id)
    on conflict (playlist_id, item_type, item_id) do nothing;
  update public.playlists set updated_at = now() where id = _playlist_id;
end $$;

create or replace function public.playlist_remove(_playlist_id uuid, _item_type text, _item_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not exists (select 1 from public.playlists where id = _playlist_id and user_id = auth.uid()) then
    raise exception 'playlist não encontrada';
  end if;
  delete from public.playlist_items
    where playlist_id = _playlist_id and item_type = _item_type and item_id = _item_id;
end $$;

create or replace function public.playlist_rename(_playlist_id uuid, _name text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  update public.playlists set name = coalesce(nullif(trim(_name), ''), name), updated_at = now()
    where id = _playlist_id and user_id = auth.uid();
end $$;

create or replace function public.playlist_set_notes(_playlist_id uuid, _notes text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  update public.playlists set notes = coalesce(_notes, ''), updated_at = now()
    where id = _playlist_id and user_id = auth.uid();
end $$;

-- Padrão ("Assistir depois") não pode ser excluída — o aluno sempre tem uma.
create or replace function public.playlist_delete(_playlist_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  delete from public.playlists
    where id = _playlist_id and user_id = auth.uid() and is_default = false;
end $$;

-- Em quais playlists um item JÁ está — pro dropdown marcar os checks.
create or replace function public.playlists_of_item(_item_type text, _item_id uuid)
returns table(playlist_id uuid)
language sql stable security definer set search_path = public as $$
  select i.playlist_id from public.playlist_items i
  join public.playlists p on p.id = i.playlist_id
  where p.user_id = auth.uid() and i.item_type = _item_type and i.item_id = _item_id;
$$;

grant execute on function public.my_playlists() to authenticated;
grant execute on function public.playlist_items_resolved(uuid) to authenticated;
grant execute on function public.playlist_create(text) to authenticated;
grant execute on function public.playlist_add(uuid, text, uuid) to authenticated;
grant execute on function public.playlist_remove(uuid, text, uuid) to authenticated;
grant execute on function public.playlist_rename(uuid, text) to authenticated;
grant execute on function public.playlist_set_notes(uuid, text) to authenticated;
grant execute on function public.playlist_delete(uuid) to authenticated;
grant execute on function public.playlists_of_item(text, uuid) to authenticated;
