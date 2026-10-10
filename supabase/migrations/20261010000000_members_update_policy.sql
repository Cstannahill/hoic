CREATE POLICY "Members can update their own username" ON public.members FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
