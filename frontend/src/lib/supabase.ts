import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yoeurzimmmzpgjvnkqcx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Bypass the Web Locks API to prevent NavigatorLockAcquireTimeoutError
    // caused by concurrent lock acquisition between signInWithPassword and onAuthStateChange
    lock: (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn(),
  },
});
