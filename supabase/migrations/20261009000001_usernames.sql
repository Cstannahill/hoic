ALTER TABLE public.members ADD COLUMN username text UNIQUE;

-- We can create a function to generate a default username
CREATE OR REPLACE FUNCTION generate_username(fname text, lname text) RETURNS text AS $$
DECLARE
  base_username text;
  new_username text;
  counter int := 1;
BEGIN
  base_username := lower(regexp_replace(substr(fname, 1, 1) || lname, '[^a-zA-Z0-9]', '', 'g'));
  new_username := base_username;
  
  WHILE EXISTS (SELECT 1 FROM public.members WHERE username = new_username) LOOP
    new_username := base_username || counter::text;
    counter := counter + 1;
  END LOOP;
  
  RETURN new_username;
END;
$$ LANGUAGE plpgsql;

-- Set username for existing members
DO $$
DECLARE
  m record;
BEGIN
  FOR m IN SELECT id, first_name, last_name FROM public.members WHERE username IS NULL LOOP
    UPDATE public.members SET username = generate_username(m.first_name, m.last_name) WHERE id = m.id;
  END LOOP;
END;
$$;

-- Make username NOT NULL after backfilling
ALTER TABLE public.members ALTER COLUMN username SET NOT NULL;
