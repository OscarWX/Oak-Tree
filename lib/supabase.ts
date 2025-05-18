import { createClient } from "@supabase/supabase-js"

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env.local file")
}

// Client-side Supabase client (limited permissions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with admin privileges (for server components and API routes)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
)

// Types based on our database schema
export type Teacher = {
  id: string
  name: string
  email: string
  created_at: string
}

export type Student = {
  id: string
  name: string
  email: string
  created_at: string
}

export type Course = {
  id: string
  title: string
  description: string | null
  teacher_id: string
  created_at: string
}

export type Lesson = {
  id: string
  course_id: string
  title: string
  week_number: number
  lesson_number: number
  topic: string
  ai_summary: string | null
  key_concepts: any[] | null
  created_at: string
  updated_at?: string
}

export type Material = {
  id: string
  lesson_id: string
  title: string
  content_type: string
  content: string | null
  file_url: string | null
  file_name: string | null
  ai_summary: string | null
  key_concepts: any | null
  created_at: string
}

export type ChatSession = {
  id: string
  student_id: string
  lesson_id: string
  started_at: string
  ended_at: string | null
  understanding_level: number | null
  strengths: any | null
  misunderstandings: any | null
  summary: string | null
}

export type ChatMessage = {
  id: string
  session_id: string
  sender_type: "ai" | "student"
  content: string
  timestamp: string
}
