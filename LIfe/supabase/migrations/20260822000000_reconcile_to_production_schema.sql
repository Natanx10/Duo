-- ============================================================
-- RECONCILIATION: align schema to REAL production shapes
-- Generated from structural diff (see _tools/final_compare.txt)
-- Production is the source of truth, NOT the legacy migrations.
-- Idempotent-safe for statement-by-statement execution.
-- ============================================================

ALTER TABLE public.categories DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.categories DROP COLUMN IF EXISTS couple_id CASCADE;
ALTER TABLE public.categories DROP COLUMN IF EXISTS icon CASCADE;
ALTER TABLE public.categories DROP COLUMN IF EXISTS is_shared CASCADE;
ALTER TABLE public.categories ALTER COLUMN color DROP DEFAULT;
ALTER TABLE public.categories ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.couples ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.couples ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.events DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.events ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN is_shared SET DEFAULT true;
ALTER TABLE public.events ALTER COLUMN is_shared DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN priority TYPE integer USING priority::integer;
ALTER TABLE public.events ALTER COLUMN priority DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE public.habit_checkins ALTER COLUMN habit_id DROP NOT NULL;
ALTER TABLE public.habit_checkins ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.habit_checkins ALTER COLUMN count TYPE integer USING count::integer;
ALTER TABLE public.habit_checkins ALTER COLUMN count DROP NOT NULL;
ALTER TABLE public.habit_checkins ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.habits ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.habits ALTER COLUMN color DROP DEFAULT;
ALTER TABLE public.habits ALTER COLUMN icon DROP DEFAULT;
ALTER TABLE public.habits ALTER COLUMN days_of_week TYPE integer[] USING days_of_week::integer[];
ALTER TABLE public.habits ALTER COLUMN days_of_week DROP DEFAULT;
ALTER TABLE public.habits ALTER COLUMN target_per_day TYPE integer USING target_per_day::integer;
ALTER TABLE public.habits ALTER COLUMN target_per_day DROP NOT NULL;
ALTER TABLE public.habits ALTER COLUMN is_shared SET DEFAULT true;
ALTER TABLE public.habits ALTER COLUMN is_shared DROP NOT NULL;
ALTER TABLE public.habits ALTER COLUMN is_active DROP NOT NULL;
ALTER TABLE public.habits ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.habits ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS color CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS updated_at CASCADE;
ALTER TABLE public.profiles ALTER COLUMN display_name DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN display_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.reminders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.reminders ALTER COLUMN remind_time TYPE text USING remind_time::text;
ALTER TABLE public.reminders ALTER COLUMN days_of_week TYPE integer[] USING days_of_week::integer[];
ALTER TABLE public.reminders ALTER COLUMN is_active DROP NOT NULL;
ALTER TABLE public.reminders ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.reminders ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE public.routine_exceptions ALTER COLUMN routine_id DROP NOT NULL;
ALTER TABLE public.routine_exceptions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.routine_exceptions ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.routines DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.routines DROP COLUMN IF EXISTS category_id CASCADE;
ALTER TABLE public.routines DROP COLUMN IF EXISTS is_shared CASCADE;
ALTER TABLE public.routines DROP COLUMN IF EXISTS updated_at CASCADE;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.routines ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.routines ALTER COLUMN day_of_week TYPE integer USING day_of_week::integer;
ALTER TABLE public.routines ALTER COLUMN start_time TYPE text USING start_time::text;
ALTER TABLE public.routines ALTER COLUMN end_time TYPE text USING end_time::text;
ALTER TABLE public.routines ALTER COLUMN color DROP DEFAULT;
ALTER TABLE public.routines ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.todos DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.todos DROP COLUMN IF EXISTS duration_minutes CASCADE;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.todos ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.todos ALTER COLUMN is_completed DROP NOT NULL;
ALTER TABLE public.todos ALTER COLUMN is_shared SET DEFAULT true;
ALTER TABLE public.todos ALTER COLUMN is_shared DROP NOT NULL;
ALTER TABLE public.todos ALTER COLUMN priority DROP NOT NULL;
ALTER TABLE public.todos ALTER COLUMN show_in_calendar DROP NOT NULL;
ALTER TABLE public.todos ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.todos ALTER COLUMN updated_at DROP NOT NULL;

-- ---- Constraint drift ----
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_couple_id_fkey;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE public.couples DROP CONSTRAINT IF EXISTS couples_created_by_fkey;
ALTER TABLE public.routine_exceptions DROP CONSTRAINT IF EXISTS routine_exceptions_routine_id_exception_date_key;
ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_day_of_week_check;
ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_category_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_created_by_fkey') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habit_checkins_user_id_fkey') THEN
    ALTER TABLE public.habit_checkins ADD CONSTRAINT habit_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_couple_id_fkey') THEN
    ALTER TABLE public.habits ADD CONSTRAINT habits_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_user_id_fkey') THEN
    ALTER TABLE public.habits ADD CONSTRAINT habits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_user_id_fkey') THEN
    ALTER TABLE public.reminders ADD CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routine_exceptions_routine_id_fkey') THEN
    ALTER TABLE public.routine_exceptions ADD CONSTRAINT routine_exceptions_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES public.routines(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routine_exceptions_user_id_fkey') THEN
    ALTER TABLE public.routine_exceptions ADD CONSTRAINT routine_exceptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routines_created_by_fkey') THEN
    ALTER TABLE public.routines ADD CONSTRAINT routines_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stickers_couple_id_fkey') THEN
    ALTER TABLE public.stickers ADD CONSTRAINT stickers_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stickers_uploaded_by_fkey') THEN
    ALTER TABLE public.stickers ADD CONSTRAINT stickers_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'todos_created_by_fkey') THEN
    ALTER TABLE public.todos ADD CONSTRAINT todos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- ---- FORCE RLS drift ----
ALTER TABLE public.couples NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.habit_checkins NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.habits NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reminders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.todos NO FORCE ROW LEVEL SECURITY;

-- ---- Remove updated_at machinery (prod dropped it) ----
DROP TRIGGER IF EXISTS events_updated_at ON public.events;
DROP TRIGGER IF EXISTS habits_updated_at ON public.habits;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS reminders_updated_at ON public.reminders;
DROP TRIGGER IF EXISTS routines_updated_at ON public.routines;
DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
