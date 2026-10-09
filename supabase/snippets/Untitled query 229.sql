INSERT INTO public.members (id, email, first_name, last_name, role, active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Admin'), 
  'User', 
  'admin', 
  true
FROM auth.users
WHERE email = 'ctan.dev@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', active = true;