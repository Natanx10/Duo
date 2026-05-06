REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- get_user_couple_id is used inside RLS policies, so it must remain executable
-- by authenticated users (RLS evaluation runs as the caller). Revoke from anon.
REVOKE EXECUTE ON FUNCTION public.get_user_couple_id(uuid) FROM anon;

-- join_couple_by_code is intentionally callable by authenticated users.
REVOKE EXECUTE ON FUNCTION public.join_couple_by_code(text) FROM anon;