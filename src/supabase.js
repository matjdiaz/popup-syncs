import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zuupzzjfxwadutblkncu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dXB6empmeHdhZHV0YmxrbmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzQzMjIsImV4cCI6MjEwMzg1MDMyMn0.3Jv6DJAyIo4KceG7mVUdOxTcfFpQSkIlIPXscUkfxRc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
