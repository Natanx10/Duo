
-- ============ COUPLES ============
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Eu',
  color text not null default '#6366f1',
  avatar_url text,
  couple_id uuid references public.couples(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ CATEGORIES ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  icon text not null default 'tag',
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ EVENTS ============
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_shared boolean not null default false,
  priority smallint not null default 1, -- 1 normal, 2 importante, 3 urgente
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events(starts_at);
create index events_user_id_idx on public.events(user_id);
create index events_couple_id_idx on public.events(couple_id);

-- ============ HELPER FUNCTION (avoid RLS recursion) ============
create or replace function public.get_user_couple_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = _user_id;
$$;

-- ============ ENABLE RLS ============
alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;

-- ============ COUPLES POLICIES ============
create policy "Couple members can view couple"
  on public.couples for select to authenticated
  using (id = public.get_user_couple_id(auth.uid()) or created_by = auth.uid());

create policy "Authenticated can create couple"
  on public.couples for insert to authenticated
  with check (created_by = auth.uid());

create policy "Couple members can update couple"
  on public.couples for update to authenticated
  using (id = public.get_user_couple_id(auth.uid()));

create policy "Couple creator can delete couple"
  on public.couples for delete to authenticated
  using (created_by = auth.uid());

-- ============ PROFILES POLICIES ============
create policy "Users view own and partner profile"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
  );

create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- ============ CATEGORIES POLICIES ============
create policy "View own or shared categories"
  on public.categories for select to authenticated
  using (
    user_id = auth.uid()
    or (is_shared = true and couple_id = public.get_user_couple_id(auth.uid()))
  );

create policy "Insert own categories"
  on public.categories for insert to authenticated
  with check (user_id = auth.uid());

create policy "Update own or shared categories"
  on public.categories for update to authenticated
  using (
    user_id = auth.uid()
    or (is_shared = true and couple_id = public.get_user_couple_id(auth.uid()))
  );

create policy "Delete own categories"
  on public.categories for delete to authenticated
  using (user_id = auth.uid());

-- ============ EVENTS POLICIES ============
create policy "View own or shared events"
  on public.events for select to authenticated
  using (
    user_id = auth.uid()
    or (is_shared = true and couple_id = public.get_user_couple_id(auth.uid()))
  );

create policy "Insert own events"
  on public.events for insert to authenticated
  with check (user_id = auth.uid());

create policy "Update own or shared events"
  on public.events for update to authenticated
  using (
    user_id = auth.uid()
    or (is_shared = true and couple_id = public.get_user_couple_id(auth.uid()))
  );

create policy "Delete own events"
  on public.events for delete to authenticated
  using (user_id = auth.uid());

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'color', '#6366f1')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ UPDATED_AT TRIGGER ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
