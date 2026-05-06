-- Fix couple invite join: a user not yet in any couple cannot SELECT the couple row
-- (RLS blocks it). Provide a SECURITY DEFINER function that resolves the invite code
-- and atomically links the user's profile to that couple.

CREATE OR REPLACE FUNCTION public.join_couple_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _couple_id uuid;
  _current_couple uuid;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT couple_id INTO _current_couple FROM public.profiles WHERE id = _user;
  IF _current_couple IS NOT NULL THEN
    RAISE EXCEPTION 'Você já está em um casal';
  END IF;

  SELECT id INTO _couple_id
  FROM public.couples
  WHERE invite_code = upper(_code)
  LIMIT 1;

  IF _couple_id IS NULL THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  UPDATE public.profiles SET couple_id = _couple_id WHERE id = _user;

  RETURN _couple_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_couple_by_code(text) TO authenticated;