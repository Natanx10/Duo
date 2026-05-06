
CREATE TABLE public.routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or shared routines"
ON public.routines FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (is_shared = true AND couple_id IS NOT NULL AND couple_id = public.get_user_couple_id(auth.uid()))
);

CREATE POLICY "Insert own routines"
ON public.routines FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own routines"
ON public.routines FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Delete own routines"
ON public.routines FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER routines_updated_at
BEFORE UPDATE ON public.routines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_routines_user ON public.routines(user_id);
CREATE INDEX idx_routines_couple ON public.routines(couple_id) WHERE couple_id IS NOT NULL;
