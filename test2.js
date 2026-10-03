const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0')
supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://localhost:3000/auth/callback' } }).then(res => console.log(res.data.url))
