import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing auth getSession...');
  const { data, error } = await supabase.auth.getSession();
  console.log('Auth result:', error ? error : 'Success');
  
  console.log('Testing signOut...');
  const { error: soErr } = await supabase.auth.signOut();
  console.log('Signout result:', soErr ? soErr : 'Success');

  console.log('Testing db...');
  const { data: dbData, error: dbError } = await supabase.from('users').select('*').limit(1);
  console.log('DB result:', dbError ? dbError : 'Success');
}
test();
