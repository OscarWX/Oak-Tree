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

    // Create a new chat session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        student_id: studentId,
        lesson_id: lessonId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessionError) {
      console.error("Error creating chat session:", sessionError)
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    // Get lesson details and key concepts
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("topic, ai_summary, key_concepts")
      .eq("id", lessonId)
      .single()

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      return NextResponse.json({ error: "Failed to fetch lesson details" }, { status: 500 })
    }

    // Generate initial greeting from Chirpy
    let initialMessage = "Chirpy: Hello! I'm Chirpy, a young blue jay who's excited to learn from you today! Can you tell me about what you've been studying?";

    // If we have key concepts, have Chirpy ask about the first one
    if (lesson.key_concepts && lesson.key_concepts.length > 0) {
      const firstConcept = lesson.key_concepts[0].concept;
      initialMessage = `Chirpy: *flutters down excitedly* Hi there! I'm Chirpy! I've heard you've been learning about ${lesson.topic}. That sounds super interesting! I'd love to understand more about ${firstConcept}. Could you explain that to me?`;
    }

    // Save the initial AI message
    const timestamp = new Date().toISOString()
    const { error: saveError } = await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionData.id,
      sender_type: "ai",
      content: initialMessage,
      timestamp
    })

    if (saveError) {
      console.error("Error saving initial message:", saveError)
      // Continue anyway to return session to user
    }

    return NextResponse.json({ 
      success: true,
      session: sessionData.id,
      message: initialMessage 
    })
  } catch (error: any) {
    console.error("Error starting chat session:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
