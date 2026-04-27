import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';

const supabaseUrl = 'https://khjzttvwbpxfegtwkxuv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoanp0dHZ3YnB4ZmVndHdreHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjAzMTcsImV4cCI6MjA5MjYzNjMxN30.SLqSOVjzjKGUJBx11Ad514iz23ywwJQHMXavRAFhVYU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
