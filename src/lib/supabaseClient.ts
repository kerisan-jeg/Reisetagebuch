// src/lib/supabaseClient.ts (oder wie deine Datei heisst)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wgxkvlgofshfhgrtzeqh.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneGt2bGdvZnNoZmhncnR6ZXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMDQ2MzgsImV4cCI6MjA3ODg4MDYzOH0.agEiBT2-1DX2zU7-Szh8caCgAGj-UPN-jNEgm46ZKJY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
