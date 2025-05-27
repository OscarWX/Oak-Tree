import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, lessonId } = body

    if (!studentId || !lessonId) {
      return NextResponse.json({ error: "Student ID and Lesson ID are required" }, { status: 400 })
    }

    // Get all chat sessions for this student and lesson
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)

    if (sessionsError) {
      console.error("Error fetching chat sessions:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch chat sessions" }, { status: 500 })
    }

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(session => session.id)

      // Delete all chat messages for these sessions
      const { error: messagesError } = await supabaseAdmin
        .from("chat_messages")
        .delete()
        .in("session_id", sessionIds)

      if (messagesError) {
        console.error("Error deleting chat messages:", messagesError)
        return NextResponse.json({ error: "Failed to delete chat messages" }, { status: 500 })
      }

      // Delete all chat sessions
      const { error: sessionsDeleteError } = await supabaseAdmin
        .from("chat_sessions")
        .delete()
        .in("id", sessionIds)

      if (sessionsDeleteError) {
        console.error("Error deleting chat sessions:", sessionsDeleteError)
        return NextResponse.json({ error: "Failed to delete chat sessions" }, { status: 500 })
      }
    }

    // Delete student understanding data for this lesson
    const { error: understandingError } = await supabaseAdmin
      .from("student_understanding")
      .delete()
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)

    if (understandingError) {
      console.error("Error deleting student understanding:", understandingError)
      return NextResponse.json({ error: "Failed to delete student understanding data" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "Conversation history and understanding data cleaned successfully",
      deletedSessions: sessions?.length || 0
    })
  } catch (error: any) {
    console.error("Error cleaning conversation history:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 