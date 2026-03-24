-- Fix occurrences RLS policies that also suffer from circular dependency
-- via events -> shared_events -> events chain

-- Create helper function for checking if user can access an event
CREATE OR REPLACE FUNCTION public.can_access_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM shared_events WHERE event_id = p_event_id AND shared_with_user_id = auth.uid()
  );
$$;

-- Drop and recreate occurrences policies using the helper function
DROP POLICY IF EXISTS "Users can log occurrences for own or shared events" ON public.occurrences;
DROP POLICY IF EXISTS "Users can view occurrences for own or shared events" ON public.occurrences;

CREATE POLICY "Users can log occurrences for own or shared events" ON public.occurrences
  FOR INSERT WITH CHECK (
    auth.uid() = logged_by AND can_access_event(event_id)
  );

CREATE POLICY "Users can view occurrences for own or shared events" ON public.occurrences
  FOR SELECT USING (
    can_access_event(event_id)
  );
