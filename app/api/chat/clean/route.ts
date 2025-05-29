import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, lessonId } = body

    if (!studentId || !lessonId) {
      return NextResponse.json({ error: "Student ID and Lesson ID are required" }, { status: 400 })
    }

    // Mark active sessions as completed instead of deleting them
    const { error: sessionsUpdateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({ 
        status: "completed",
        ended_at: new Date().toISOString()
      })
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .eq("status", "active")

    if (sessionsUpdateError) {
      console.error("Error updating chat sessions:", sessionsUpdateError)
      return NextResponse.json({ error: "Failed to reset chat sessions" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Session reset successfully. Previous progress preserved for teacher review." 
    })
  } catch (error: any) {
    console.error("Error in clean conversation API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 