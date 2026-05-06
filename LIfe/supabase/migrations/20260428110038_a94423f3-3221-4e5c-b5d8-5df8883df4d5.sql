-- HABITS
CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  couple_id uuid,
  title text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'check-circle',
  days_of_week smallint[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::smallint[],
  target_per_day smallint NOT NULL DEFAULT 1,
  is_shared boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or shared habits" ON public.habits FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (is_shared = true AND couple_id IS NOT NULL AND couple_id = get_user_couple_id(auth.uid())));
CREATE POLICY "Insert own habits" ON public.habits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own habits" ON public.habits FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Delete own habits" ON public.habits FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER habits_updated_at BEFORE UPDATE ON public.habits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HABIT CHECK-INS
CREATE TABLE public.habit_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  checkin_date date NOT NULL,
  count smallint NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, user_id, checkin_date)
);
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View checkins for accessible habits" ON public.habit_checkins FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.habits h
  WHERE h.id = habit_checkins.habit_id
    AND (h.user_id = auth.uid() OR (h.is_shared = true AND h.couple_id IS NOT NULL AND h.couple_id = get_user_couple_id(auth.uid())))
));
CREATE POLICY "Insert own checkins" ON public.habit_checkins FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.habits h
  WHERE h.id = habit_checkins.habit_id
    AND (h.user_id = auth.uid() OR (h.is_shared = true AND h.couple_id IS NOT NULL AND h.couple_id = get_user_couple_id(auth.uid())))
));
CREATE POLICY "Update own checkins" ON public.habit_checkins FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Delete own checkins" ON public.habit_checkins FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_habit_checkins_habit_date ON public.habit_checkins(habit_id, checkin_date);

-- REMINDERS
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  remind_at timestamptz,
  remind_time time,
  days_of_week smallint[],
  habit_id uuid REFERENCES public.habits(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  routine_id uuid REFERENCES public.routines(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own reminders" ON public.reminders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own reminders" ON public.reminders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own reminders" ON public.reminders FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Delete own reminders" ON public.reminders FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER reminders_updated_at BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();