INSERT INTO public.members (id, email, first_name, last_name, role, active) VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'Test', 'User', 'worker', true) ON CONFLICT DO NOTHING;
