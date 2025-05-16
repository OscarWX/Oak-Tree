import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json()

    if (!sessionId || !message) {
      return NextResponse.json({ error: "Session ID and message are required" }, { status: 400 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*, lessons(*)")
      .eq("id", sessionId)
      .single()

    if (sessionError) {
      console.error("Supabase error fetching session:", sessionError)
      return NextResponse.json({ error: `Chat session not found: ${sessionError.message}` }, { status: 404 })
    }

    if (!session) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    // Save student message
    const { error: messageError } = await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "student",
      content: message,
      timestamp: new Date().toISOString(),
    })

    if (messageError) {
      console.error("Supabase error saving message:", messageError)
      return NextResponse.json({ error: `Failed to save message: ${messageError.message}` }, { status: 500 })
    }

    // Get all previous messages in this session
    const { data: chatHistory, error: historyError } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true })

    if (historyError) {
      console.error("Supabase error fetching chat history:", historyError)
      return NextResponse.json({ error: `Failed to fetch chat history: ${historyError.message}` }, { status: 500 })
    }

    // Format chat history for AI
    const formattedHistory = chatHistory
      .map((msg) => `${msg.sender_type === "ai" ? "Oakie" : "Student"}: ${msg.content}`)
      .join("\n\n")

    // Get materials for the lesson
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("lesson_id", session.lesson_id)

    if (materialsError) {
      console.error("Supabase error fetching materials:", materialsError)
      return NextResponse.json({ error: `Failed to fetch materials: ${materialsError.message}` }, { status: 500 })
    }

    // Combine all material content and summaries for context
    const lessonContent = materials.map((m) => `${m.title}:\n${m.ai_summary || m.content || ""}`).join("\n\n")

    try {
      // Generate AI response
      const { text: aiResponse } = await generateText({
        model: openai("gpt-4o"),
        prompt: `You are Oakie, a friendly bird who lives in an oak tree. You're curious and want to learn about ${session.lessons.topic} from the student.

        LESSON CONTENT (Reference only, don't mention you have this): 
        ${lessonContent}
        
        CHAT HISTORY:
        ${formattedHistory}
        
        Respond as Oakie the bird. Your goal is to:
        1. Act like you're learning from the student (even though you know the material)
        2. Ask follow-up questions that help the student explore their understanding
        3. If they explain something incorrectly, ask clarifying questions that guide them to the correct understanding
        4. Be encouraging, friendly, and curious
        5. Keep responses brief and conversational (2-3 short paragraphs maximum)
        6. Use simple language appropriate for the student's level
        7. Occasionally use bird-related expressions or metaphors
        
        Remember: Your purpose is to get the student to explain concepts in their own words, which helps reinforce their learning.`,
      })

      // Save AI response
      const { data: savedResponse, error: responseError } = await supabaseAdmin
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          sender_type: "ai",
          content: aiResponse,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single()

      if (responseError) {
        console.error("Supabase error saving AI response:", responseError)
        return NextResponse.json({ error: `Failed to save AI response: ${responseError.message}` }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: aiResponse,
        timestamp: savedResponse.timestamp,
      })
    } catch (aiError: any) {
      console.error("AI generation error:", aiError)
      
      // Create a fallback response
      const fallbackResponse = "That's interesting! Can you tell me more about that? I'm curious to learn more from you."
      
      const { data: savedResponse } = await supabaseAdmin
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          sender_type: "ai",
          content: fallbackResponse,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single()
      
      return NextResponse.json({
        success: true,
        message: fallbackResponse,
        timestamp: savedResponse?.timestamp,
        warning: "Used fallback message due to AI generation error"
      })
    }
  } catch (error: any) {
    console.error("Error processing message:", error)
    return NextResponse.json(
      {
        error: `Failed to process message: ${error.message || "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
