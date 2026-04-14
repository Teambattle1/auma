import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jxyzrkrfbkrsdkmjqxwy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eXpya3JmYmtyc2RrbWpxeHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjIyOTQsImV4cCI6MjA5MTY5ODI5NH0.mjB7pNm5B0tsXDEaB3x0b8D29LOd2I6y_tMGOPOk41o'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export { supabaseUrl }
