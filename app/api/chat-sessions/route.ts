import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Mock data for testing
const MOCK_SESSIONS = [
  {
    id: "session1",
    student_id: "student1",
    lesson_id: "lesson1",
    started_at: new Date().toISOString(),
    ended_at: null,
    understanding_level: null,
    strengths: null,
    misunderstandings: null,
    summary: null
  }
]

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId")
    const lessonId = request.nextUrl.searchParams.get("lessonId")
    
    // Return mock data for testing
    if (request.nextUrl.searchParams.get("mock") === "true" || (studentId && lessonId)) {
      return NextResponse.json({ sessions: MOCK_SESSIONS })
    }

    let query = supabaseAdmin.from("chat_sessions").select("*")

    if (studentId) {
      query = query.eq("student_id", studentId)
    }

    if (lessonId) {
      query = query.eq("lesson_id", lessonId)
    }

    // Get most recent sessions first
    query = query.order("started_at", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ sessions: MOCK_SESSIONS })
    }

    return NextResponse.json({ sessions: data })
  } catch (error: any) {
    console.error("Error fetching chat sessions:", error)
    return NextResponse.json({ sessions: MOCK_SESSIONS })
  }
} 