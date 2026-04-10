import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yoeurzimmmzpgjvnkqcx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY not configured. Auth will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
