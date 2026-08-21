-- Production schema snapshot - generated via pg catalog queries
-- (pg_dump unavailable: no Docker/pg_dump on this machine)
-- Date: 2026-08-21T01:50:27.445Z
-- NOTE: storage bucket rows (storage.buckets) are DATA, not DDL.
--       If replaying into a fresh project, create the 'stickers'
--       bucket manually or via INSERT before uploading files.

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================================
-- ENUMS
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.couples (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invite_code text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  couple_id uuid,
  created_by uuid,
  title text NOT NULL,
  description text,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  is_shared boolean DEFAULT true,
  category_id uuid,
  priority integer DEFAULT 1,
  location text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_checkins (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  habit_id uuid,
  user_id uuid,
  checkin_date date NOT NULL,
  count integer DEFAULT 1,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habits (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  couple_id uuid,
  title text NOT NULL,
  description text,
  color text NOT NULL,
  icon text NOT NULL,
  days_of_week integer[] NOT NULL,
  target_per_day integer DEFAULT 1,
  is_shared boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (  id uuid NOT NULL,
  display_name text,
  avatar_url text,
  couple_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reminders (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  title text NOT NULL,
  remind_at timestamp with time zone,
  remind_time text,
  days_of_week integer[],
  habit_id uuid,
  event_id uuid,
  routine_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_exceptions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  routine_id uuid,
  user_id uuid,
  exception_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routines (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  couple_id uuid,
  created_by uuid,
  title text NOT NULL,
  day_of_week integer NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stickers (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  couple_id uuid,
  uploaded_by uuid,
  image_url text NOT NULL,
  label text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.todos (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  couple_id uuid,
  created_by uuid,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  is_shared boolean DEFAULT true,
  priority integer DEFAULT 1,
  category_id uuid,
  due_at timestamp with time zone,
  show_in_calendar boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);


-- ============================================================
-- CONSTRAINTS (PK / UNIQUE / FK / CHECK)
-- ============================================================
ALTER TABLE public.couples ADD CONSTRAINT couples_invite_code_key UNIQUE (invite_code);
ALTER TABLE public.events ADD CONSTRAINT events_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD CONSTRAINT events_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.habit_checkins ADD CONSTRAINT habit_checkins_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE;
ALTER TABLE public.habit_checkins ADD CONSTRAINT habit_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.habit_checkins ADD CONSTRAINT habit_checkins_habit_id_user_id_checkin_date_key UNIQUE (habit_id, user_id, checkin_date);
ALTER TABLE public.habits ADD CONSTRAINT habits_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE;
ALTER TABLE public.habits ADD CONSTRAINT habits_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
ALTER TABLE public.reminders ADD CONSTRAINT reminders_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD CONSTRAINT reminders_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD CONSTRAINT reminders_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.routine_exceptions ADD CONSTRAINT routine_exceptions_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE;
ALTER TABLE public.routine_exceptions ADD CONSTRAINT routine_exceptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.routines ADD CONSTRAINT routines_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE;
ALTER TABLE public.routines ADD CONSTRAINT routines_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.stickers ADD CONSTRAINT stickers_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE;
ALTER TABLE public.stickers ADD CONSTRAINT stickers_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.todos ADD CONSTRAINT todos_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public.todos ADD CONSTRAINT todos_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE;
ALTER TABLE public.todos ADD CONSTRAINT todos_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE public.couples ADD CONSTRAINT couples_pkey PRIMARY KEY (id);
ALTER TABLE public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE public.habit_checkins ADD CONSTRAINT habit_checkins_pkey PRIMARY KEY (id);
ALTER TABLE public.habits ADD CONSTRAINT habits_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.reminders ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);
ALTER TABLE public.routine_exceptions ADD CONSTRAINT routine_exceptions_pkey PRIMARY KEY (id);
ALTER TABLE public.routines ADD CONSTRAINT routines_pkey PRIMARY KEY (id);
ALTER TABLE public.stickers ADD CONSTRAINT stickers_pkey PRIMARY KEY (id);
ALTER TABLE public.todos ADD CONSTRAINT todos_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.bytea_to_text(data bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/http', $function$bytea_to_text$function$
;

CREATE OR REPLACE FUNCTION public.get_user_couple_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select couple_id
  from public.profiles
  where id = _user_id
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.http(request http_request)
 RETURNS http_response
 LANGUAGE c
AS '$libdir/http', $function$http_request$function$
;

CREATE OR REPLACE FUNCTION public.http_delete(uri character varying, content character varying, content_type character varying)
 RETURNS http_response
 LANGUAGE sql
AS $function$ SELECT public.http(('DELETE', $1, NULL, $3, $2)::public.http_request) $function$
;

CREATE OR REPLACE FUNCTION public.http_delete(uri character varying)
 RETURNS http_response
 LANGUAGE sql
AS $function$ SELECT public.http(('DELETE', $1, NULL, NULL, NULL)::public.http_request) $function$
;

CREATE OR REPLACE FUNCTION public.http_get(uri character varying)
 RETURNS http_response
 LANGUAGE sql
AS $function$ SELECT public.http(('GET', $1, NULL, NULL, NULL)::public.http_request) $function$
;

CREATE OR REPLACE FUNCTION public.http_get(uri character varying, data jsonb)
 RETURNS http_response
 LANGUAGE sql
AS $function$
        SELECT public.http(('GET', $1 || '?' || public.urlencode($2), NULL, NULL, NULL)::public.http_request)
    $function$
;

CREATE OR REPLACE FUNCTION public.http_head(uri character varying)
 RETURNS http_response
 LANGUAGE sql
AS $function$ SELECT public.http(('HEAD', $1, NULL, NULL, NULL)::public.http_request) $function$
;

CREATE OR REPLACE FUNCTION public.http_header(field character varying, value character varying)
 RETURNS http_header
 LANGUAGE sql
AS $function$ SELECT $1, $2 $function$
;

CREATE OR REPLACE FUNCTION public.http_list_curlopt()
 RETURNS TABLE(curlopt text, value text)
 LANGUAGE c
AS '$libdir/http', $function$http_list_curlopt$function$
;

CREATE OR REPLACE FUNCTION public.http_patch(uri character varying, content character varying, content_type character varying)
 RETURNS http_response
 LANGUAGE sql
AS $function$ SELECT public.http(('PATCH', $1, NULL, $3, $2)::public.http_request) $function$
;

CREATE OR REPLACE FUNCTION public.http_post(uri character varying, data jsonb)
 RETURNS http_response
 LANGUAGE sql
AS $function$
        SELECT public.http(('POST', $1, NULL, 'application/x-www-form-urlencoded', public.urlencode($2))::public.http_request)
    $function$
;

CREATE OR REPLACE FUNCTION public.http_post(uri character varying, content character varying, content_type character varying)
 RETURNS http_response
 LANGUAGE sql
AS $function$ SELECT public.http(('POST', $1, NULL, $3, $2)::public.http_request) $function$
;

CREATE OR REPLACE FUNCTION public.http_put(uri character varying, content character varying, content_type character varying)
 RETURNS http_response
 LANGUAGE sql
AS $function$ SELECT public.http(('PUT', $1, NULL, $3, $2)::public.http_request) $function$
;

CREATE OR REPLACE FUNCTION public.http_reset_curlopt()
 RETURNS boolean
 LANGUAGE c
AS '$libdir/http', $function$http_reset_curlopt$function$
;

CREATE OR REPLACE FUNCTION public.http_set_curlopt(curlopt character varying, value character varying)
 RETURNS boolean
 LANGUAGE c
AS '$libdir/http', $function$http_set_curlopt$function$
;

CREATE OR REPLACE FUNCTION public.join_couple_by_code(_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    found_couple_id UUID;
BEGIN
    SELECT id INTO found_couple_id FROM public.couples WHERE invite_code = _code LIMIT 1;
    RETURN found_couple_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.text_to_bytea(data text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/http', $function$text_to_bytea$function$
;

CREATE OR REPLACE FUNCTION public.urlencode(string character varying)
 RETURNS text
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/http', $function$urlencode$function$
;

CREATE OR REPLACE FUNCTION public.urlencode(string bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/http', $function$urlencode$function$
;

CREATE OR REPLACE FUNCTION public.urlencode(data jsonb)
 RETURNS text
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/http', $function$urlencode_jsonb$function$
;


-- ============================================================
-- TRIGGERS (incl. auth.users)
-- ============================================================
-- on auth.users
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- NOTE: triggers on auth.users may require elevated privileges to replay.
--       If CREATE TRIGGER fails on auth.users, run it via SQL Editor
--       (runs as elevated role) instead of a migration.

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES (public)
-- ============================================================
CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.categories
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.couples
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Couple members delete events" ON public.events
  FOR DELETE
  TO "authenticated"
  USING (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))));

CREATE POLICY "Couple members insert events" ON public.events
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))));

CREATE POLICY "Couple members update events" ON public.events
  FOR UPDATE
  TO "authenticated"
  USING (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))))
  WITH CHECK (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))));

CREATE POLICY "Couple members view events" ON public.events
  FOR SELECT
  TO "authenticated"
  USING (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))));

CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.habit_checkins
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.habits
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((id = auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  TO "authenticated"
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

CREATE POLICY "Users view own and partner profile" ON public.profiles
  FOR SELECT
  TO "authenticated"
  USING (((id = auth.uid()) OR ((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid())))));

CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.push_subscriptions
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions
  FOR DELETE
  TO "public"
  USING ((auth.uid() = user_id));

CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions
  FOR INSERT
  TO "public"
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "push_subs_select_own" ON public.push_subscriptions
  FOR SELECT
  TO "public"
  USING ((auth.uid() = user_id));

CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.reminders
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.routine_exceptions
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Couple members delete routines" ON public.routines
  FOR DELETE
  TO "authenticated"
  USING (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))));

CREATE POLICY "Couple members insert routines" ON public.routines
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))));

CREATE POLICY "Couple members update routines" ON public.routines
  FOR UPDATE
  TO "authenticated"
  USING (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))))
  WITH CHECK (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))));

CREATE POLICY "Couple members view routines" ON public.routines
  FOR SELECT
  TO "authenticated"
  USING (((couple_id IS NOT NULL) AND (couple_id = get_user_couple_id(auth.uid()))));

CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.stickers
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Permitir acesso total a todos os autenticados" ON public.todos
  FOR ALL
  TO "public"
  USING ((auth.role() = 'authenticated'::text));


-- ============================================================
-- POLICIES (storage)
-- ============================================================
CREATE POLICY "Acesso publico as imagens" ON storage.objects
  FOR SELECT
  TO "public"
  USING ((bucket_id = 'stickers'::text));

CREATE POLICY "Permitir upload para usuarios autenticados" ON storage.objects
  FOR INSERT
  TO "public"
  WITH CHECK (((bucket_id = 'stickers'::text) AND (auth.role() = 'authenticated'::text)));


-- ============================================================
-- PRIVILEGES (deterministic: revoke defaults, then grant captured state)
-- ============================================================
-- Table-level: reset then restore
REVOKE ALL ON TABLE public.categories FROM anon, authenticated;
REVOKE ALL ON TABLE public.couples FROM anon, authenticated;
REVOKE ALL ON TABLE public.events FROM anon, authenticated;
REVOKE ALL ON TABLE public.habit_checkins FROM anon, authenticated;
REVOKE ALL ON TABLE public.habits FROM anon, authenticated;
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.reminders FROM anon, authenticated;
REVOKE ALL ON TABLE public.routine_exceptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.routines FROM anon, authenticated;
REVOKE ALL ON TABLE public.stickers FROM anon, authenticated;
REVOKE ALL ON TABLE public.todos FROM anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.categories TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.categories TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.couples TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.couples TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.events TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.events TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.habit_checkins TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.habit_checkins TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.habits TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.habits TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.push_subscriptions TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.push_subscriptions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.reminders TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.reminders TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.routine_exceptions TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.routine_exceptions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.routines TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.routines TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.stickers TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.stickers TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.todos TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.todos TO authenticated;

-- Column-level: revoke every column not explicitly granted
GRANT INSERT (color, created_at, id, name) ON public.categories TO anon;
GRANT UPDATE (color, created_at, id, name) ON public.categories TO anon;
GRANT SELECT (color, created_at, id, name) ON public.categories TO anon;
GRANT REFERENCES (color, created_at, id, name) ON public.categories TO anon;
GRANT SELECT (color, created_at, id, name) ON public.categories TO authenticated;
GRANT INSERT (color, created_at, id, name) ON public.categories TO authenticated;
GRANT UPDATE (color, created_at, id, name) ON public.categories TO authenticated;
GRANT REFERENCES (color, created_at, id, name) ON public.categories TO authenticated;
GRANT SELECT (created_at, created_by, id, invite_code) ON public.couples TO anon;
GRANT REFERENCES (created_at, created_by, id, invite_code) ON public.couples TO anon;
GRANT INSERT (created_at, created_by, id, invite_code) ON public.couples TO anon;
GRANT UPDATE (created_at, created_by, id, invite_code) ON public.couples TO anon;
GRANT REFERENCES (created_at, created_by, id, invite_code) ON public.couples TO authenticated;
GRANT INSERT (created_at, created_by, id, invite_code) ON public.couples TO authenticated;
GRANT UPDATE (created_at, created_by, id, invite_code) ON public.couples TO authenticated;
GRANT SELECT (created_at, created_by, id, invite_code) ON public.couples TO authenticated;
GRANT UPDATE (category_id, couple_id, created_at, created_by, description, ends_at, id, is_shared, location, priority, starts_at, title, updated_at) ON public.events TO anon;
GRANT INSERT (category_id, couple_id, created_at, created_by, description, ends_at, id, is_shared, location, priority, starts_at, title, updated_at) ON public.events TO anon;
GRANT REFERENCES (category_id, couple_id, created_at, created_by, description, ends_at, id, is_shared, location, priority, starts_at, title, updated_at) ON public.events TO anon;
GRANT SELECT (category_id, couple_id, created_at, created_by, description, ends_at, id, is_shared, location, priority, starts_at, title, updated_at) ON public.events TO anon;
GRANT INSERT (category_id, couple_id, created_at, created_by, description, ends_at, id, is_shared, location, priority, starts_at, title, updated_at) ON public.events TO authenticated;
GRANT UPDATE (category_id, couple_id, created_at, created_by, description, ends_at, id, is_shared, location, priority, starts_at, title, updated_at) ON public.events TO authenticated;
GRANT SELECT (category_id, couple_id, created_at, created_by, description, ends_at, id, is_shared, location, priority, starts_at, title, updated_at) ON public.events TO authenticated;
GRANT REFERENCES (category_id, couple_id, created_at, created_by, description, ends_at, id, is_shared, location, priority, starts_at, title, updated_at) ON public.events TO authenticated;
GRANT SELECT (checkin_date, count, created_at, habit_id, id, note, user_id) ON public.habit_checkins TO anon;
GRANT UPDATE (checkin_date, count, created_at, habit_id, id, note, user_id) ON public.habit_checkins TO anon;
GRANT INSERT (checkin_date, count, created_at, habit_id, id, note, user_id) ON public.habit_checkins TO anon;
GRANT REFERENCES (checkin_date, count, created_at, habit_id, id, note, user_id) ON public.habit_checkins TO anon;
GRANT REFERENCES (checkin_date, count, created_at, habit_id, id, note, user_id) ON public.habit_checkins TO authenticated;
GRANT SELECT (checkin_date, count, created_at, habit_id, id, note, user_id) ON public.habit_checkins TO authenticated;
GRANT UPDATE (checkin_date, count, created_at, habit_id, id, note, user_id) ON public.habit_checkins TO authenticated;
GRANT INSERT (checkin_date, count, created_at, habit_id, id, note, user_id) ON public.habit_checkins TO authenticated;
GRANT INSERT (color, couple_id, created_at, days_of_week, description, icon, id, is_active, is_shared, target_per_day, title, updated_at, user_id) ON public.habits TO anon;
GRANT REFERENCES (color, couple_id, created_at, days_of_week, description, icon, id, is_active, is_shared, target_per_day, title, updated_at, user_id) ON public.habits TO anon;
GRANT SELECT (color, couple_id, created_at, days_of_week, description, icon, id, is_active, is_shared, target_per_day, title, updated_at, user_id) ON public.habits TO anon;
GRANT UPDATE (color, couple_id, created_at, days_of_week, description, icon, id, is_active, is_shared, target_per_day, title, updated_at, user_id) ON public.habits TO anon;
GRANT INSERT (color, couple_id, created_at, days_of_week, description, icon, id, is_active, is_shared, target_per_day, title, updated_at, user_id) ON public.habits TO authenticated;
GRANT UPDATE (color, couple_id, created_at, days_of_week, description, icon, id, is_active, is_shared, target_per_day, title, updated_at, user_id) ON public.habits TO authenticated;
GRANT SELECT (color, couple_id, created_at, days_of_week, description, icon, id, is_active, is_shared, target_per_day, title, updated_at, user_id) ON public.habits TO authenticated;
GRANT REFERENCES (color, couple_id, created_at, days_of_week, description, icon, id, is_active, is_shared, target_per_day, title, updated_at, user_id) ON public.habits TO authenticated;
GRANT SELECT (avatar_url, couple_id, created_at, display_name, id) ON public.profiles TO anon;
GRANT UPDATE (avatar_url, couple_id, created_at, display_name, id) ON public.profiles TO anon;
GRANT REFERENCES (avatar_url, couple_id, created_at, display_name, id) ON public.profiles TO anon;
GRANT INSERT (avatar_url, couple_id, created_at, display_name, id) ON public.profiles TO anon;
GRANT UPDATE (avatar_url, couple_id, created_at, display_name, id) ON public.profiles TO authenticated;
GRANT SELECT (avatar_url, couple_id, created_at, display_name, id) ON public.profiles TO authenticated;
GRANT REFERENCES (avatar_url, couple_id, created_at, display_name, id) ON public.profiles TO authenticated;
GRANT INSERT (avatar_url, couple_id, created_at, display_name, id) ON public.profiles TO authenticated;
GRANT INSERT (auth, created_at, endpoint, id, p256dh, user_id) ON public.push_subscriptions TO anon;
GRANT REFERENCES (auth, created_at, endpoint, id, p256dh, user_id) ON public.push_subscriptions TO anon;
GRANT SELECT (auth, created_at, endpoint, id, p256dh, user_id) ON public.push_subscriptions TO anon;
GRANT UPDATE (auth, created_at, endpoint, id, p256dh, user_id) ON public.push_subscriptions TO anon;
GRANT INSERT (auth, created_at, endpoint, id, p256dh, user_id) ON public.push_subscriptions TO authenticated;
GRANT REFERENCES (auth, created_at, endpoint, id, p256dh, user_id) ON public.push_subscriptions TO authenticated;
GRANT SELECT (auth, created_at, endpoint, id, p256dh, user_id) ON public.push_subscriptions TO authenticated;
GRANT UPDATE (auth, created_at, endpoint, id, p256dh, user_id) ON public.push_subscriptions TO authenticated;
GRANT UPDATE (created_at, days_of_week, event_id, habit_id, id, is_active, remind_at, remind_time, routine_id, title, updated_at, user_id) ON public.reminders TO anon;
GRANT SELECT (created_at, days_of_week, event_id, habit_id, id, is_active, remind_at, remind_time, routine_id, title, updated_at, user_id) ON public.reminders TO anon;
GRANT REFERENCES (created_at, days_of_week, event_id, habit_id, id, is_active, remind_at, remind_time, routine_id, title, updated_at, user_id) ON public.reminders TO anon;
GRANT INSERT (created_at, days_of_week, event_id, habit_id, id, is_active, remind_at, remind_time, routine_id, title, updated_at, user_id) ON public.reminders TO anon;
GRANT INSERT (created_at, days_of_week, event_id, habit_id, id, is_active, remind_at, remind_time, routine_id, title, updated_at, user_id) ON public.reminders TO authenticated;
GRANT UPDATE (created_at, days_of_week, event_id, habit_id, id, is_active, remind_at, remind_time, routine_id, title, updated_at, user_id) ON public.reminders TO authenticated;
GRANT SELECT (created_at, days_of_week, event_id, habit_id, id, is_active, remind_at, remind_time, routine_id, title, updated_at, user_id) ON public.reminders TO authenticated;
GRANT REFERENCES (created_at, days_of_week, event_id, habit_id, id, is_active, remind_at, remind_time, routine_id, title, updated_at, user_id) ON public.reminders TO authenticated;
GRANT REFERENCES (created_at, exception_date, id, routine_id, user_id) ON public.routine_exceptions TO anon;
GRANT INSERT (created_at, exception_date, id, routine_id, user_id) ON public.routine_exceptions TO anon;
GRANT UPDATE (created_at, exception_date, id, routine_id, user_id) ON public.routine_exceptions TO anon;
GRANT SELECT (created_at, exception_date, id, routine_id, user_id) ON public.routine_exceptions TO anon;
GRANT SELECT (created_at, exception_date, id, routine_id, user_id) ON public.routine_exceptions TO authenticated;
GRANT UPDATE (created_at, exception_date, id, routine_id, user_id) ON public.routine_exceptions TO authenticated;
GRANT REFERENCES (created_at, exception_date, id, routine_id, user_id) ON public.routine_exceptions TO authenticated;
GRANT INSERT (created_at, exception_date, id, routine_id, user_id) ON public.routine_exceptions TO authenticated;
GRANT INSERT (color, couple_id, created_at, created_by, day_of_week, end_time, id, start_time, title) ON public.routines TO anon;
GRANT UPDATE (color, couple_id, created_at, created_by, day_of_week, end_time, id, start_time, title) ON public.routines TO anon;
GRANT SELECT (color, couple_id, created_at, created_by, day_of_week, end_time, id, start_time, title) ON public.routines TO anon;
GRANT REFERENCES (color, couple_id, created_at, created_by, day_of_week, end_time, id, start_time, title) ON public.routines TO anon;
GRANT INSERT (color, couple_id, created_at, created_by, day_of_week, end_time, id, start_time, title) ON public.routines TO authenticated;
GRANT REFERENCES (color, couple_id, created_at, created_by, day_of_week, end_time, id, start_time, title) ON public.routines TO authenticated;
GRANT SELECT (color, couple_id, created_at, created_by, day_of_week, end_time, id, start_time, title) ON public.routines TO authenticated;
GRANT UPDATE (color, couple_id, created_at, created_by, day_of_week, end_time, id, start_time, title) ON public.routines TO authenticated;
GRANT INSERT (couple_id, created_at, id, image_url, label, uploaded_by) ON public.stickers TO anon;
GRANT REFERENCES (couple_id, created_at, id, image_url, label, uploaded_by) ON public.stickers TO anon;
GRANT SELECT (couple_id, created_at, id, image_url, label, uploaded_by) ON public.stickers TO anon;
GRANT UPDATE (couple_id, created_at, id, image_url, label, uploaded_by) ON public.stickers TO anon;
GRANT SELECT (couple_id, created_at, id, image_url, label, uploaded_by) ON public.stickers TO authenticated;
GRANT INSERT (couple_id, created_at, id, image_url, label, uploaded_by) ON public.stickers TO authenticated;
GRANT REFERENCES (couple_id, created_at, id, image_url, label, uploaded_by) ON public.stickers TO authenticated;
GRANT UPDATE (couple_id, created_at, id, image_url, label, uploaded_by) ON public.stickers TO authenticated;
GRANT SELECT (category_id, completed_at, couple_id, created_at, created_by, description, due_at, id, is_completed, is_shared, priority, show_in_calendar, title, updated_at) ON public.todos TO anon;
GRANT INSERT (category_id, completed_at, couple_id, created_at, created_by, description, due_at, id, is_completed, is_shared, priority, show_in_calendar, title, updated_at) ON public.todos TO anon;
GRANT REFERENCES (category_id, completed_at, couple_id, created_at, created_by, description, due_at, id, is_completed, is_shared, priority, show_in_calendar, title, updated_at) ON public.todos TO anon;
GRANT UPDATE (category_id, completed_at, couple_id, created_at, created_by, description, due_at, id, is_completed, is_shared, priority, show_in_calendar, title, updated_at) ON public.todos TO anon;
GRANT UPDATE (category_id, completed_at, couple_id, created_at, created_by, description, due_at, id, is_completed, is_shared, priority, show_in_calendar, title, updated_at) ON public.todos TO authenticated;
GRANT SELECT (category_id, completed_at, couple_id, created_at, created_by, description, due_at, id, is_completed, is_shared, priority, show_in_calendar, title, updated_at) ON public.todos TO authenticated;
GRANT REFERENCES (category_id, completed_at, couple_id, created_at, created_by, description, due_at, id, is_completed, is_shared, priority, show_in_calendar, title, updated_at) ON public.todos TO authenticated;
GRANT INSERT (category_id, completed_at, couple_id, created_at, created_by, description, due_at, id, is_completed, is_shared, priority, show_in_calendar, title, updated_at) ON public.todos TO authenticated;

-- Sequence-level: reset then restore
