-- ================================================================
-- Notificacoes de movimentos do casal
-- Eventos/Tarefas/Habitos compartilhados: criado, atualizado,
-- concluido, excluido -> parceiro(a) recebe push.
-- Padrao OUTBOX: triggers apenas enfileiram (escrita instantanea,
-- imune a falhas de rede); job cron esvazia a fila a cada minuto.
-- ================================================================

-- ---------- 1. Fila ----------
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  tag text,
  url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
-- Sem policies: invisivel para clientes; escrita apenas via SECURITY DEFINER.

-- ---------- 2. Parceiro de um usuario ----------
CREATE OR REPLACE FUNCTION public.partner_of(actor uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.couple_id = (SELECT couple_id FROM public.profiles WHERE id = actor)
    AND p.id <> actor
  LIMIT 1
$$;

-- ---------- 3. Enfileirador ----------
CREATE OR REPLACE FUNCTION public.notify_partner_enqueue(
  kind text, item_title text, action text, actor uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target uuid;
BEGIN
  IF actor IS NULL THEN RETURN; END IF;
  SELECT public.partner_of(actor) INTO target;
  IF target IS NULL OR target = actor THEN RETURN; END IF;

  INSERT INTO public.notification_outbox (target_user_id, title, body, tag, url)
  VALUES (
    target,
    kind || ' | ' || action,
    COALESCE(NULLIF(item_title, ''), '(sem titulo)'),
    'duo-partner',
    '/calendar'
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- notificacao nunca deve quebrar a operacao principal
END;
$$;

-- ---------- 4. Trigger generico ----------
CREATE OR REPLACE FUNCTION public.handle_partner_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  actor uuid;
  kind text := TG_ARGV[0];
  action text;
  item_title text;
BEGIN
  actor := COALESCE(
    auth.uid(),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  );

  IF TG_OP = 'INSERT' THEN
    item_title := NEW.title;
    action := 'criado pelo parceiro(a)';
    CASE kind
      WHEN 'Evento' THEN action := 'novo evento';
      WHEN 'Tarefa' THEN action := 'nova tarefa';
      WHEN 'Habito' THEN action := 'novo habito';
    END CASE;
    PERFORM public.notify_partner_enqueue(kind, item_title, action, actor);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    item_title := NEW.title;
    action := 'atualizado pelo parceiro(a)';
    IF kind = 'Tarefa' AND OLD.is_completed = false AND NEW.is_completed = true THEN
      action := 'tarefa concluida';
    ELSIF kind = 'Tarefa' AND OLD.is_completed = true AND NEW.is_completed = false THEN
      action := 'tarefa reaberta';
    END IF;
    PERFORM public.notify_partner_enqueue(kind, item_title, action, actor);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    item_title := OLD.title;
    action := 'excluido pelo parceiro(a)';
    PERFORM public.notify_partner_enqueue(kind, item_title, action, actor);
    RETURN OLD;
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- ---------- 5. Check-in de habito (conclusao diaria) ----------
CREATE OR REPLACE FUNCTION public.handle_habit_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  habit_title text;
  actor uuid;
BEGIN
  actor := COALESCE(NEW.user_id, auth.uid());
  SELECT title INTO habit_title FROM public.habits WHERE id = NEW.habit_id;
  PERFORM public.notify_partner_enqueue(
    'Habito',
    COALESCE(habit_title, 'habito'),
    'habito marcado como feito hoje',
    actor
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ---------- 6. Instalar triggers (idempotente) ----------
DROP TRIGGER IF EXISTS events_partner_notify ON public.events;
CREATE TRIGGER events_partner_notify
AFTER INSERT OR UPDATE OR DELETE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.handle_partner_change('Evento');

DROP TRIGGER IF EXISTS todos_partner_notify ON public.todos;
CREATE TRIGGER todos_partner_notify
AFTER INSERT OR UPDATE OR DELETE ON public.todos
FOR EACH ROW EXECUTE FUNCTION public.handle_partner_change('Tarefa');

DROP TRIGGER IF EXISTS habits_partner_notify ON public.habits;
CREATE TRIGGER habits_partner_notify
AFTER INSERT OR UPDATE OR DELETE ON public.habits
FOR EACH ROW EXECUTE FUNCTION public.handle_partner_change('Habito');

DROP TRIGGER IF EXISTS habit_checkins_partner_notify ON public.habit_checkins;
CREATE TRIGGER habit_checkins_partner_notify
AFTER INSERT ON public.habit_checkins
FOR EACH ROW EXECUTE FUNCTION public.handle_habit_checkin();

-- ---------- 7. Job que esvazia a fila (a cada minuto) ----------
SELECT cron.unschedule('duo-outbox-flush') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'duo-outbox-flush'
);

SELECT cron.schedule(
  'duo-outbox-flush',
  '* * * * *',
  $$
  WITH targets AS (
    SELECT id, target_user_id, title, body, tag
    FROM public.notification_outbox
    ORDER BY created_at
    LIMIT 20
  ),
  calls AS (
    SELECT
      targets.id AS outbox_id,
      http(
        ('POST',
         COALESCE(NULLIF(current_setting('app.supabase_url', true), ''), 'https://nbrclmquepvudugdlclx.supabase.co') || '/functions/v1/send-push',
         ARRAY[['x-cron-secret', 'TROQUE_PELO_CRON_SECRET']],
         'application/json',
         json_build_object(
           'user_ids', json_build_array(targets.target_user_id),
           'title', targets.title,
           'body', targets.body,
           'tag', COALESCE(targets.tag, 'duo-partner'),
           'url', COALESCE(targets.url, '/calendar')
         )::text
       )::http_request
    ) AS resp
    FROM targets
  )
  DELETE FROM public.notification_outbox
  WHERE id IN (SELECT outbox_id FROM calls WHERE (resp).status = 200)
  $$
);
