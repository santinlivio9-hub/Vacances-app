-- Budget Voyage : schéma Supabase (à coller dans SQL Editor → New query → Run).
-- Chaque utilisateur ne voit et ne modifie que ses propres lignes (Row Level Security).
-- Le script peut être relancé sans risque.

-- Profils : nom, avatar et préférences par défaut
create table if not exists public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text,
  avatar_url text,
  preferences jsonb not null default '{}'::jsonb,
  -- Vrai quand les données locales ont été importées (ou refusées) à la première connexion
  import_fait boolean not null default false,
  maj_le timestamptz not null default now()
);

-- Voyages sauvegardés (et brouillons)
create table if not exists public.voyages (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null,
  donnees jsonb not null,
  maj_le timestamptz not null default now(),
  primary key (user_id, id)
);

-- Favoris : destinations, activités, logements, propositions
create table if not exists public.favoris (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null,
  donnees jsonb not null,
  ajoute_le timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.profils enable row level security;
alter table public.voyages enable row level security;
alter table public.favoris enable row level security;

-- Règles : uniquement ses propres données
drop policy if exists "profil : le sien" on public.profils;
create policy "profil : le sien" on public.profils
  for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "voyages : les siens" on public.voyages;
create policy "voyages : les siens" on public.voyages
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "favoris : les siens" on public.favoris;
create policy "favoris : les siens" on public.favoris
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Un profil est créé à l'inscription, avec le nom et l'avatar fournis par Google s'il y en a
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profils (id, nom, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists a_l_inscription on auth.users;
create trigger a_l_inscription
  after insert on auth.users
  for each row execute function public.creer_profil();

-- « Supprimer mon compte » : sans serveur, l'app appelle cette fonction.
-- Elle ne peut supprimer QUE le compte de la personne connectée ; ses voyages, favoris
-- et profil disparaissent avec lui (on delete cascade).
create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
