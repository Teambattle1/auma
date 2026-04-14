import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wqvqzyighqoaynagutkx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdnF6eWlnaHFvYXluYWd1dGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTU4MzUsImV4cCI6MjA3OTMzMTgzNX0.6j8xV_O6gPaDxj21wWc9CN_JajIhxF0_6MemrT_tl2U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export { supabaseUrl }
