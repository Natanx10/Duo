-- ================================================================
-- Cron Job: dispara push para lembretes agendados (LIfe / producao)
-- Roda a cada minuto e chama a Edge Function send-push para cada
-- usuario com lembrete ativo naquele horario (America/Sao_Paulo).
-- Requer: Edge Function 'send-push' criada + secret CRON_SECRET
-- configurado com o MESMO valor do literal abaixo.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

SELECT cron.unschedule('duo-push-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'duo-push-reminders'
);

SELECT cron.schedule(
  'duo-push-reminders',
  '* * * * *',
  $$
  WITH due AS (
    SELECT DISTINCT r.user_id, r.title,
      COALESCE(r.remind_at::text, 'recorrente') AS reason
    FROM public.reminders r
    WHERE r.is_active = true
      AND (
        (r.remind_at IS NOT NULL
          AND r.remind_at >= now()
          AND r.remind_at < now() + interval '1 minute')
        OR
        (r.remind_time IS NOT NULL
          AND to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') = left(r.remind_time::text, 5)
          AND (
            r.days_of_week IS NULL
            OR array_length(r.days_of_week, 1) IS NULL
            OR EXTRACT(DOW FROM now() AT TIME ZONE 'America/Sao_Paulo')::int = ANY(r.days_of_week)
          )
        )
      )
  ),
  batch AS (
    SELECT json_agg(DISTINCT user_id::text) AS user_ids
    FROM due
  )
  SELECT
    CASE WHEN batch.user_ids IS NOT NULL THEN
      (SELECT http(
        ('POST',
         COALESCE(NULLIF(current_setting('app.supabase_url', true), ''), 'https://nbrclmquepvudugdlclx.supabase.co') || '/functions/v1/send-push',
         ARRAY[['x-cron-secret', 'TROQUE_PELO_CRON_SECRET']],
         'application/json',
         json_build_object(
           'user_ids', batch.user_ids,
           'title', 'Lembrete do Duo',
           'body', 'Você tem um lembrete agendado.',
           'tag', 'duo-cron'
         )::text
       )::http_request)
    END
  FROM batch;
  $$
);
