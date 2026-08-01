-- Lock couple-owned data so an authenticated user can only access rows for
-- their own profiles.couple_id. This intentionally uses couple_id for calendar
-- tables because the production schema has drifted from earlier user_id-based
-- migrations.

create or replace function public.get_user_couple_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = _user_id;
$$;

grant execute on function public.get_user_couple_id(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.couples enable row level security;
alter table public.couples force row level security;
alter table public.events enable row level security;
alter table public.events force row level security;
alter table public.todos enable row level security;
alter table public.todos force row level security;
alter table public.routines enable row level security;
alter table public.routines force row level security;
alter table public.habits enable row level security;
alter table public.habits force row level security;
alter table public.habit_checkins enable row level security;
alter table public.habit_checkins force row level security;
alter table public.reminders enable row level security;
alter table public.reminders force row level security;

revoke update (couple_id) on public.profiles from authenticated;
revoke update (id, created_by) on public.couples from authenticated;

drop policy if exists "Users view own and partner profile" on public.profiles;
create policy "Users view own and partner profile"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or (
    couple_id is not null
    and couple_id = public.get_user_couple_id(auth.uid())
  )
);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Couple members can view couple" on public.couples;
create policy "Couple members can view couple"
on public.couples for select to authenticated
using (id = public.get_user_couple_id(auth.uid()));

drop policy if exists "Authenticated can create couple" on public.couples;
create policy "Authenticated can create couple"
on public.couples for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "Couple members can update couple" on public.couples;
create policy "Couple members can update couple"
on public.couples for update to authenticated
using (id = public.get_user_couple_id(auth.uid()))
with check (id = public.get_user_couple_id(auth.uid()));

drop policy if exists "Couple creator can delete couple" on public.couples;
create policy "Couple creator can delete couple"
on public.couples for delete to authenticated
using (created_by = auth.uid());

drop policy if exists "View own or shared events" on public.events;
drop policy if exists "Insert own events" on public.events;
drop policy if exists "Update own or shared events" on public.events;
drop policy if exists "Delete own events" on public.events;
create policy "Couple members view events"
on public.events for select to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members insert events"
on public.events for insert to authenticated
with check (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members update events"
on public.events for update to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
with check (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members delete events"
on public.events for delete to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));

drop policy if exists "View own or shared couple todos" on public.todos;
drop policy if exists "Insert own todos" on public.todos;
drop policy if exists "Update own todos" on public.todos;
drop policy if exists "Update own or shared couple todos" on public.todos;
drop policy if exists "Delete own todos" on public.todos;
create policy "Couple members view todos"
on public.todos for select to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members insert todos"
on public.todos for insert to authenticated
with check (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members update todos"
on public.todos for update to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
with check (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members delete todos"
on public.todos for delete to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));

drop policy if exists "View own or shared routines" on public.routines;
drop policy if exists "Insert own routines" on public.routines;
drop policy if exists "Update own routines" on public.routines;
drop policy if exists "Delete own routines" on public.routines;
create policy "Couple members view routines"
on public.routines for select to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members insert routines"
on public.routines for insert to authenticated
with check (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members update routines"
on public.routines for update to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
with check (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));
create policy "Couple members delete routines"
on public.routines for delete to authenticated
using (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()));

drop policy if exists "View own or shared habits" on public.habits;
drop policy if exists "Insert own habits" on public.habits;
drop policy if exists "Update own habits" on public.habits;
drop policy if exists "Delete own habits" on public.habits;
create policy "Users view own or couple habits"
on public.habits for select to authenticated
using (
  user_id = auth.uid()
  or (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
);
create policy "Users insert own habits"
on public.habits for insert to authenticated
with check (
  user_id = auth.uid()
  and (couple_id is null or couple_id = public.get_user_couple_id(auth.uid()))
);
create policy "Users update own habits"
on public.habits for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (couple_id is null or couple_id = public.get_user_couple_id(auth.uid()))
);
create policy "Users delete own habits"
on public.habits for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "View checkins for accessible habits" on public.habit_checkins;
drop policy if exists "Insert own checkins" on public.habit_checkins;
drop policy if exists "Update own checkins" on public.habit_checkins;
drop policy if exists "Delete own checkins" on public.habit_checkins;
create policy "Users view accessible habit checkins"
on public.habit_checkins for select to authenticated
using (
  exists (
    select 1 from public.habits h
    where h.id = habit_id
      and (
        h.user_id = auth.uid()
        or (h.couple_id is not null and h.couple_id = public.get_user_couple_id(auth.uid()))
      )
  )
);
create policy "Users insert own checkins"
on public.habit_checkins for insert to authenticated
with check (user_id = auth.uid());
create policy "Users update own checkins"
on public.habit_checkins for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "Users delete own checkins"
on public.habit_checkins for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "View own reminders" on public.reminders;
drop policy if exists "Insert own reminders" on public.reminders;
drop policy if exists "Update own reminders" on public.reminders;
drop policy if exists "Delete own reminders" on public.reminders;
create policy "Users view own reminders"
on public.reminders for select to authenticated
using (user_id = auth.uid());
create policy "Users insert own reminders"
on public.reminders for insert to authenticated
with check (user_id = auth.uid());
create policy "Users update own reminders"
on public.reminders for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "Users delete own reminders"
on public.reminders for delete to authenticated
using (user_id = auth.uid());
