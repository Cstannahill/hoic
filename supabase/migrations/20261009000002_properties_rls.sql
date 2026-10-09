-- Allow foreman and admin to manage properties
CREATE POLICY "Managers can insert properties" ON public.properties 
FOR INSERT TO authenticated 
WITH CHECK (private.current_role() IN ('foreman', 'admin'));

CREATE POLICY "Managers can update properties" ON public.properties 
FOR UPDATE TO authenticated 
USING (private.current_role() IN ('foreman', 'admin'))
WITH CHECK (private.current_role() IN ('foreman', 'admin'));
