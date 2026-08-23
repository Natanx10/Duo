-- ============================================================
-- SECURITY: restore row-level isolation between couples
-- Production currently exposes 9 tables to ALL authenticated
-- users via blanket policies. This drops them and restores
-- scoped rules designed against the RECONCILED schema
-- (20260822000000). Statement-by-statement execution required
-- through transaction poolers.
-- KNOWN RESIDUAL RISK: public.categories has no owner column in
-- production; it stays authenticated-writable by design until a
-- schema change adds couple_id (requires app coordination).
-- ============================================================

-- ---------- 1. Drop blanket policies ----------
DROP POLICY IF EXISTS "Permitir acesso total a todos os autenticados" ON public.couples;
DROP POLICY IF EXISTS "Permitir acesso total a todos os autenticados" ON public.todos;
DROP POLICY IF EXISTS "Permitir acesso total a todos os autenticados" ON public.habits;
DROP POLICY IF EXISTS "Permitir acesso total a todos os autenticados" ON public.habit_checkins;
DROP POLICY IF EXISTS "Permitir acesso total a todos os autenticados" ON public.reminders;
DROP POLICY IF EXISTS "Permitir acesso total a todos os autenticados" ON public.routine_exceptions;
DROP POLICY IF EXISTS "Permitir acesso total a todos os autenticados" ON public.stickers;
DROP POLICY IF EXISTS "Permitir acesso total a todos os autenticados" ON public.push_subscriptions;

-- ---------- 2. couples ----------
CREATE POLICY "Couple members can view couple" ON public.couples
  FOR SELECT TO authenticated
  USING (id = get_user_couple_id(auth.uid()));

CREATE POLICY "Authenticated can create couple" ON public.couples
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Couple members can update couple" ON public.couples
  FOR UPDATE TO authenticated
  USING (id = get_user_couple_id(auth.uid()))
  WITH CHECK (id = get_user_couple_id(auth.uid()));

CREATE POLICY "Couple creator can delete couple" ON public.couples
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ---------- 3. todos (couple-scoped, no user_id in prod) ----------
CREATE POLICY "Couple members view todos" ON public.todos
  FOR SELECT TO authenticated
  USING (couple_id = get_user_couple_id(auth.uid()));

CREATE POLICY "Couple members insert todos" ON public.todos
  FOR INSERT TO authenticated
  WITH CHECK (couple_id = get_user_couple_id(auth.uid()));

CREATE POLICY "Couple members update todos" ON public.todos
  FOR UPDATE TO authenticated
  USING (couple_id = get_user_couple_id(auth.uid()))
  WITH CHECK (couple_id = get_user_couple_id(auth.uid()));

CREATE POLICY "Couple members delete todos" ON public.todos
  FOR DELETE TO authenticated
  USING (couple_id = get_user_couple_id(auth.uid()));

-- ---------- 4. habits (owner + shared-with-couple read) ----------
CREATE POLICY "Users view own or couple habits" ON public.habits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR couple_id = get_user_couple_id(auth.uid()));

CREATE POLICY "Users insert own habits" ON public.habits
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own habits" ON public.habits
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR couple_id = get_user_couple_id(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR couple_id = get_user_couple_id(auth.uid()));

CREATE POLICY "Users delete own habits" ON public.habits
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- 5. habit_checkins (own rows; visible if habit accessible) ----------
CREATE POLICY "Users view accessible habit checkins" ON public.habit_checkins
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id
        AND (h.user_id = auth.uid() OR h.couple_id = get_user_couple_id(auth.uid()))
    )
  );

CREATE POLICY "Users insert own checkins" ON public.habit_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id
        AND (h.user_id = auth.uid() OR h.couple_id = get_user_couple_id(auth.uid()))
    )
  );

CREATE POLICY "Users update own checkins" ON public.habit_checkins
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own checkins" ON public.habit_checkins
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- 6. reminders (strictly own) ----------
CREATE POLICY "Users view own reminders" ON public.reminders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own reminders" ON public.reminders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own reminders" ON public.reminders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own reminders" ON public.reminders
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- 7. routine_exceptions (own or via couple routine) ----------
CREATE POLICY "View exceptions for accessible routines" ON public.routine_exceptions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.routines r
      WHERE r.id = routine_id
        AND r.couple_id = get_user_couple_id(auth.uid())
    )
  );

CREATE POLICY "Insert exceptions for accessible routines" ON public.routine_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.routines r
      WHERE r.id = routine_id
        AND (r.couple_id = get_user_couple_id(auth.uid()) OR user_id = auth.uid())
    )
  );

CREATE POLICY "Update own exceptions" ON public.routine_exceptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own exceptions" ON public.routine_exceptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- 8. stickers (couple-scoped; uploader manages) ----------
CREATE POLICY "Couple members view stickers" ON public.stickers
  FOR SELECT TO authenticated
  USING (couple_id = get_user_couple_id(auth.uid()));

CREATE POLICY "Couple members insert stickers" ON public.stickers
  FOR INSERT TO authenticated
  WITH CHECK (couple_id = get_user_couple_id(auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Uploader updates stickers" ON public.stickers
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploader deletes stickers" ON public.stickers
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- ---------- 9. push_subscriptions (already has *_own set; blanket dropped above) ----------
