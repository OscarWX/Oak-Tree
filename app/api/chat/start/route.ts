import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { studentId, lessonId } = await request.json()

    if (!studentId || !lessonId) {
      return NextResponse.json({ error: "Student ID and Lesson ID are required" }, { status: 400 })
    }

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("*, courses(*)")
      .eq("id", lessonId)
      .single()

    if (lessonError) {
      console.error("Supabase error fetching lesson:", lessonError)
      return NextResponse.json({ error: `Lesson not found: ${lessonError.message}` }, { status: 404 })
    }
    
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Get materials for the lesson
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("lesson_id", lessonId)

    if (materialsError) {
      console.error("Supabase error fetching materials:", materialsError)
      return NextResponse.json({ error: `Failed to fetch materials: ${materialsError.message}` }, { status: 500 })
    }

    // Combine all material content and summaries
    const combinedContent = materials.map((m) => `${m.title}:\n${m.ai_summary || m.content || ""}`).join("\n\n")

    // Extract all key concepts
    const allKeyConcepts = materials.flatMap((m) => m.key_concepts || [])

    // Create a new chat session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        student_id: studentId,
        lesson_id: lessonId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessionError) {
      console.error("Supabase error creating session:", sessionError)
      return NextResponse.json({ error: `Failed to create chat session: ${sessionError.message}` }, { status: 500 })
    }

    try {
      // Generate initial AI message based on lesson content
      const { text: initialMessage } = await generateText({
        model: openai("gpt-4o"),
        prompt: `You are a friendly bird named "Oakie" who lives in an oak tree. You're curious and want to learn about ${lesson.topic} from the student. 
        
        The lesson is about: ${combinedContent}
        
        Generate a friendly, conversational opening message where you:
        1. Introduce yourself as Oakie the bird
        2. Express curiosity about what the student learned in their ${lesson.topic} lesson
        3. Ask them to teach you about one of the key concepts
        4. Keep your message friendly, brief, and engaging for students
        
        Your goal is to get the student to explain concepts in their own words, which helps reinforce their learning.`,
      })

      // Save the initial AI message
      const { error: messageError } = await supabaseAdmin.from("chat_messages").insert({
        session_id: session.id,
        sender_type: "ai",
        content: initialMessage,
        timestamp: new Date().toISOString(),
      })

      if (messageError) {
        console.error("Supabase error saving message:", messageError)
        return NextResponse.json({ error: `Failed to save initial message: ${messageError.message}` }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        session: session.id,
        message: initialMessage,
        keyConcepts: allKeyConcepts,
      })
    } catch (aiError: any) {
      console.error("AI generation error:", aiError)
      
      // Still return the session but with a fallback message
      const fallbackMessage = "Hi there! I'm Oakie the bird. Can you tell me about what you learned today?"
      
      await supabaseAdmin.from("chat_messages").insert({
        session_id: session.id,
        sender_type: "ai",
        content: fallbackMessage,
        timestamp: new Date().toISOString(),
      })
      
      return NextResponse.json({
        success: true,
        session: session.id,
        message: fallbackMessage,
        keyConcepts: allKeyConcepts,
        warning: "Used fallback message due to AI generation error"
      })
    }
  } catch (error: any) {
    console.error("Error starting chat:", error)
    return NextResponse.json(
      {
        error: `Failed to start chat session: ${error.message || "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
