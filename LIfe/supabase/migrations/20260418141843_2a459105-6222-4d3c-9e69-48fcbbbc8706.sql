-- Ensure timestamp function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  show_in_calendar BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 1,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or shared couple todos"
ON public.todos FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    is_shared = true
    AND couple_id IS NOT NULL
    AND couple_id = public.get_user_couple_id(auth.uid())
  )
);

CREATE POLICY "Insert own todos"
ON public.todos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own todos"
ON public.todos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Delete own todos"
ON public.todos FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_todos_updated_at
BEFORE UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_todos_user_id ON public.todos(user_id);
CREATE INDEX idx_todos_couple_id ON public.todos(couple_id) WHERE couple_id IS NOT NULL;
CREATE INDEX idx_todos_due_at ON public.todos(due_at) WHERE due_at IS NOT NULL;