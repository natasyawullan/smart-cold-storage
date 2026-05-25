import { createClient } from '@supabase/supabase-js';

// Besok siang tinggal kita ganti pake URL & Anon Key dari dashboard Supabase-mu
const supabaseUrl = 'https://lfgpjefdnzhkbycmzdam.supabase.co';
const supabaseAnonKey = 'sb_publishable_NqzKACGAgIU-JtxyGniD-A_0hh6EbaA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);