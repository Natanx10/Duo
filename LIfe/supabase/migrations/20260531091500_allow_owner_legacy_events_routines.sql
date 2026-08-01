-- Keep couple isolation, but also allow each user to access their own
-- legacy rows where couple_id may be null (pre-migration data).

drop policy if exists "Couple members view events" on public.events;
drop policy if exists "Couple members insert events" on public.events;
drop policy if exists "Couple members update events" on public.events;
drop policy if exists "Couple members delete events" on public.events;

create policy "Couple members or owner view events"
on public.events for select to authenticated
using (
  (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
  or user_id = auth.uid()
);

create policy "Couple members or owner insert events"
on public.events for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    couple_id is null
    or couple_id = public.get_user_couple_id(auth.uid())
  )
);

create policy "Couple members or owner update events"
on public.events for update to authenticated
using (
  (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
  or user_id = auth.uid()
)
with check (
  user_id = auth.uid()
  and (
    couple_id is null
    or couple_id = public.get_user_couple_id(auth.uid())
  )
);

create policy "Couple members or owner delete events"
on public.events for delete to authenticated
using (
  (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
  or user_id = auth.uid()
);

drop policy if exists "Couple members view routines" on public.routines;
drop policy if exists "Couple members insert routines" on public.routines;
drop policy if exists "Couple members update routines" on public.routines;
drop policy if exists "Couple members delete routines" on public.routines;

create policy "Couple members or owner view routines"
on public.routines for select to authenticated
using (
  (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
  or user_id = auth.uid()
);

create policy "Couple members or owner insert routines"
on public.routines for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    couple_id is null
    or couple_id = public.get_user_couple_id(auth.uid())
  )
);

create policy "Couple members or owner update routines"
on public.routines for update to authenticated
using (
  (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
  or user_id = auth.uid()
)
with check (
  user_id = auth.uid()
  and (
    couple_id is null
    or couple_id = public.get_user_couple_id(auth.uid())
  )
);

create policy "Couple members or owner delete routines"
on public.routines for delete to authenticated
using (
  (couple_id is not null and couple_id = public.get_user_couple_id(auth.uid()))
  or user_id = auth.uid()
);
