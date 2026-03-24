-- Secure function to look up a profile ID by email (bypasses RLS)
-- Used by the sharing feature so users can find others by email
CREATE OR REPLACE FUNCTION public.lookup_profile_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE email = lower(p_email) LIMIT 1;
$$;

-- Allow users to see display_name/email of people they share with
-- (needed to show "shared with" list in the UI)
CREATE POLICY "Users can view profiles they share events with" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT shared_with_user_id FROM public.shared_events
      WHERE is_event_owner(event_id)
    )
  );
