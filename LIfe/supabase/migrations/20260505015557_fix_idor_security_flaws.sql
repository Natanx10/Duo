-- Fix IDOR on profiles: Prevent users from updating couple_id directly
REVOKE UPDATE (couple_id) ON public.profiles FROM authenticated;

-- Fix insecure updates on couples table
REVOKE UPDATE (id, created_by) ON public.couples FROM authenticated;

-- Fix EVENTS policies
DROP POLICY IF EXISTS "Insert own events" ON public.events;
CREATE POLICY "Insert own events" ON public.events FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND 
  (couple_id IS NULL OR couple_id = public.get_user_couple_id(auth.uid()))
);

DROP POLICY IF EXISTS "Update own or shared events" ON public.events;
CREATE POLICY "Update own or shared events" ON public.events FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() 
  OR (is_shared = true AND couple_id = public.get_user_couple_id(auth.uid()))
)
WITH CHECK (
  user_id = auth.uid() AND 
  (couple_id IS NULL OR couple_id = public.get_user_couple_id(auth.uid()))
);

-- Fix CATEGORIES policies
DROP POLICY IF EXISTS "Insert own categories" ON public.categories;
CREATE POLICY "Insert own categories" ON public.categories FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND 
  (couple_id IS NULL OR couple_id = public.get_user_couple_id(auth.uid()))
);

DROP POLICY IF EXISTS "Update own or shared categories" ON public.categories;
CREATE POLICY "Update own or shared categories" ON public.categories FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() 
  OR (is_shared = true AND couple_id = public.get_user_couple_id(auth.uid()))
)
WITH CHECK (
  user_id = auth.uid() AND 
  (couple_id IS NULL OR couple_id = public.get_user_couple_id(auth.uid()))
);

-- Fix ROUTINES policies
DROP POLICY IF EXISTS "Insert own routines" ON public.routines;
CREATE POLICY "Insert own routines" ON public.routines FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND 
  (couple_id IS NULL OR couple_id = public.get_user_couple_id(auth.uid()))
);

DROP POLICY IF EXISTS "Update own routines" ON public.routines;
CREATE POLICY "Update own routines" ON public.routines FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND 
  (couple_id IS NULL OR couple_id = public.get_user_couple_id(auth.uid()))
);

-- Fix HABITS policies
DROP POLICY IF EXISTS "Insert own habits" ON public.habits;
CREATE POLICY "Insert own habits" ON public.habits FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND 
  (couple_id IS NULL OR couple_id = public.get_user_couple_id(auth.uid()))
);

DROP POLICY IF EXISTS "Update own habits" ON public.habits;
CREATE POLICY "Update own habits" ON public.habits FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND 
  (couple_id IS NULL OR couple_id = public.get_user_couple_id(auth.uid()))
);

-- Fix HABIT_CHECKINS policies
DROP POLICY IF EXISTS "Update own checkins" ON public.habit_checkins;
CREATE POLICY "Update own checkins" ON public.habit_checkins FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix REMINDERS policies
DROP POLICY IF EXISTS "Update own reminders" ON public.reminders;
CREATE POLICY "Update own reminders" ON public.reminders FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
