ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_to uuid;
CREATE OR REPLACE FUNCTION public.list_team()
RETURNS TABLE(user_id uuid, email text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.user_id, t.email FROM public.team_members t WHERE public.is_team(auth.uid()) ORDER BY t.created_at
$$;
GRANT EXECUTE ON FUNCTION public.list_team() TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
CREATE POLICY "team upload chat files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-files' AND public.is_team(auth.uid()));