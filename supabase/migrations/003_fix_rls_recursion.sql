-- Fix circular RLS recursion between events and shared_events tables
-- The problem: events SELECT policy references shared_events, 
-- and shared_events SELECT policy references events, causing infinite recursion.

-- Create a security definer function to check event ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_event_owner(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND user_id = auth.uid()
  );
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view shared events" ON public.events;
DROP POLICY IF EXISTS "Users can view shares involving them" ON public.shared_events;
DROP POLICY IF EXISTS "Event owners can share" ON public.shared_events;
DROP POLICY IF EXISTS "Event owners can unshare" ON public.shared_events;

-- Recreate events shared view policy (this one is fine, it just reads shared_events)
CREATE POLICY "Users can view shared events" ON public.events
  FOR SELECT USING (
    id IN (
      SELECT event_id FROM public.shared_events
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- Recreate shared_events policies using security definer function to break the cycle
CREATE POLICY "Users can view shares involving them" ON public.shared_events
  FOR SELECT USING (
    shared_with_user_id = auth.uid() OR is_event_owner(event_id)
  );

CREATE POLICY "Event owners can share" ON public.shared_events
  FOR INSERT WITH CHECK (
    is_event_owner(event_id)
  );

CREATE POLICY "Event owners can unshare" ON public.shared_events
  FOR DELETE USING (
    is_event_owner(event_id)
  );
