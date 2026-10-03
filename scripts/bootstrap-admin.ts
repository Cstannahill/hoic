import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Note: Use the service role key for admin privileges
);

async function bootstrap() {
  const email = 'test@example.com';
  const password = 'testpassword123';

  console.log(`Creating test user: ${email}...`);

  // Create user in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log(`User created with ID: ${userId}`);

  // Insert into public.members
  const { error: memberError } = await supabase
    .from('members')
    .insert({
      id: userId,
      email: email,
      first_name: 'Test',
      last_name: 'Admin',
      role: 'admin',
      active: true,
    });

  if (memberError) {
    console.error('Error inserting member record:', memberError);
    return;
  }

  console.log('Successfully created test user and assigned admin role.');
  console.log('Email:', email);
  console.log('Password:', password);
}

bootstrap();
