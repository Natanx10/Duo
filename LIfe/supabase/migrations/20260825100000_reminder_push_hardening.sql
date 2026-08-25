-- ================================================================
-- Hardening do push de lembretes:
-- 1) Coluna last_pushed_at: impede disparo duplicado entre ticks
-- 2) Janela de tolerancia de 90s (nao perde mais o minuto exato)
-- 3) Tag por lembrete (reminder-<id>): server push e timer local
--    usam a MESMA tag -> o navegador substitui em vez de empilhar
-- ================================================================

ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS last_pushed_at timestamptz;

SELECT cron.unschedule('duo-push-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'duo-push-reminders'
);

SELECT cron.schedule(
  'duo-push-reminders',
  '* * * * *',
  $$
  WITH due AS (
    UPDATE public.reminders r
    SET last_pushed_at = now()
    WHERE r.is_active = true
      AND (r.last_pushed_at IS NULL OR r.last_pushed_at < now() - interval '20 hours')
      AND (
        (r.remind_at IS NOT NULL
          AND r.remind_at >= now() - interval '90 seconds'
          AND r.remind_at < now() + interval '1 minute')
        OR
        (r.remind_time IS NOT NULL
          AND ABS(
            EXTRACT(EPOCH FROM (
              (now() AT TIME ZONE 'America/Sao_Paulo')::time
              - r.remind_time::time
            ))
          ) <= 60
          AND (
            r.days_of_week IS NULL
            OR array_length(r.days_of_week, 1) IS NULL
            OR EXTRACT(DOW FROM now() AT TIME ZONE 'America/Sao_Paulo')::int = ANY(r.days_of_week)
          )
        )
      )
    RETURNING r.id, r.user_id, r.title
  ),
  batch AS (
    SELECT json_agg(json_build_object('user_id', user_id::text, 'id', id::text, 'title', title)) AS items
    FROM due
  )
  SELECT
    CASE WHEN batch.items IS NOT NULL THEN
      (
        SELECT http((
          'POST',
          COALESCE(NULLIF(current_setting('app.supabase_url', true), ''), 'https://nbrclmquepvudugdlclx.supabase.co') || '/functions/v1/send-push',
          ARRAY[['x-cron-secret', 'TROQUE_PELO_CRON_SECRET']],
          'application/json',
          item.payload::text
        )::http_request)
      FROM (
        SELECT json_build_object(
          'user_ids', json_build_array(item.value->>'user_id'),
          'title', item.value->>'title',
          'body', 'Você tem um lembrete neste horário.',
          'tag', 'reminder-' || (item.value->>'id'),
          'url', '/calendar'
        ) AS payload,
        (item.value->>'user_id') AS uid,
        ROW_NUMBER() OVER () AS rn
        FROM json_array_elements(batch.items) AS item(value)
      ) item
      WHERE NOT EXISTS (
        SELECT 1
        FROM json_array_elements(batch.items) AS other(value)
        WHERE (other.value->>'user_id') = item.uid
          AND (other.value->>'id') < (item.value->>'id')
      )
    END
  FROM batch;
  $$
);
