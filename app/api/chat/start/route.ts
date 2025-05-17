import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, lessonId } = body

    if (!studentId || !lessonId) {
      return NextResponse.json({ error: "Student ID and Lesson ID are required" }, { status: 400 })
    }

    // For testing, just return a fixed session ID
    return NextResponse.json({ session: "session1" })

    // The code below would normally be used to create a real session in Supabase
    /*
    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        student_id: studentId,
        lesson_id: lessonId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating chat session:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data.id })
    */
  } catch (error: any) {
    console.error("Error starting chat session:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
