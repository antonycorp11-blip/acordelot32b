import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ojfnqcajbhvlqtprrfxg.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm5xY2FqYmh2bHF0cHJyZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNTI2MDMsImV4cCI6MjEwMjkyODYwM30.5yGrdipKkLNO6xx3whdE-6a2ub5MjEfVFEdxfqHlIbg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
