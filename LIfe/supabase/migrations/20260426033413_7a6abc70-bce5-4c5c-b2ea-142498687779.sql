-- 1) Permitir que ambos do casal atualizem tarefas compartilhadas (para "concluir")
DROP POLICY IF EXISTS "Update own todos" ON public.todos;
CREATE POLICY "Update own or shared couple todos"
ON public.todos
FOR UPDATE
TO public
USING (
  auth.uid() = user_id
  OR (
    is_shared = true
    AND couple_id IS NOT NULL
    AND couple_id = public.get_user_couple_id(auth.uid())
  )
);

-- 2) Tabela de exceções de rotina (excluir ou pular instância única)
CREATE TABLE IF NOT EXISTS public.routine_exceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id uuid NOT NULL,
  user_id uuid NOT NULL,
  exception_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_id, exception_date)
);

ALTER TABLE public.routine_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert exceptions for accessible routines"
ON public.routine_exceptions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.routines r
    WHERE r.id = routine_id
      AND (
        r.user_id = auth.uid()
        OR (r.is_shared = true AND r.couple_id IS NOT NULL AND r.couple_id = public.get_user_couple_id(auth.uid()))
      )
  )
);

CREATE POLICY "View exceptions for accessible routines"
ON public.routine_exceptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routines r
    WHERE r.id = routine_id
      AND (
        r.user_id = auth.uid()
        OR (r.is_shared = true AND r.couple_id IS NOT NULL AND r.couple_id = public.get_user_couple_id(auth.uid()))
      )
  )
);

CREATE POLICY "Delete own exceptions"
ON public.routine_exceptions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_routine_exceptions_routine ON public.routine_exceptions(routine_id, exception_date);
