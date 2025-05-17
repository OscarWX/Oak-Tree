import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { Message } from "ai/react"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message } = body

    if (!sessionId || !message) {
      return NextResponse.json({ error: "Session ID and message are required" }, { status: 400 })
    }

    // Get session details including the lesson
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*, lessons(*)")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    // Get previous messages in this session
    const { data: previousMessages, error: historyError } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true })

    if (historyError) {
      return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
    }

    // Get materials for the lesson to provide context to the AI
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("lesson_id", session.lesson_id)

    if (materialsError) {
      return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
    }

    // Save the user's message to the database
    const timestamp = new Date().toISOString()
    const { error: saveError } = await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "student",
      content: message,
      timestamp
    })

    if (saveError) {
      console.error("Error saving user message:", saveError)
      // Continue anyway to provide a response to the user
    }

    // Format previous messages for the AI
    const formattedHistory = previousMessages.map(msg => ({
      role: msg.sender_type === "ai" ? "assistant" as const : "user" as const,
      content: msg.content
    }))

    // Extract context from materials
    const materialContent = materials
      .map(m => {
        let content = `TITLE: ${m.title}\n`
        if (m.ai_summary) {
          content += `SUMMARY: ${m.ai_summary}\n`
        }
        if (m.key_concepts && Array.isArray(m.key_concepts) && m.key_concepts.length > 0) {
          content += `KEY CONCEPTS: ${m.key_concepts.map((c: { concept: string }) => c.concept).join(", ")}\n`
        }
        return content
      })
      .join("\n\n")

    // Generate AI response
    const { text: aiResponse } = await generateText({
      model: openai("gpt-3.5-turbo"),
      system: `You are Oakie, an AI study buddy designed to help students learn by encouraging them to teach concepts back to you.
      
      Your role is to:
      1. Act as a curious and interested peer who wants to learn
      2. Ask students to explain concepts from their lesson materials
      3. Be friendly, encouraging, and use simple language
      4. Express confusion or ask follow-up questions when appropriate
      5. Show excitement when students explain things well
      6. Guide them to think more deeply when they miss important points
      7. Never simply tell them the answers - your goal is to make THEM explain
      
      Current lesson: ${session.lessons.topic}
      
      Material context:
      ${materialContent}
      
      IMPORTANT GUIDELINES:
      - Start by asking the student to explain key concepts
      - Act like you're learning from them, not teaching them
      - Ask specific questions about the lesson concepts
      - Be conversational and friendly, like a study partner
      - Encourage the student to elaborate on their explanations
      - You are a friendly bird character who lives in an oak tree, so occasionally use bird metaphors`,
      messages: [
        ...formattedHistory,
        { role: "user" as const, content: message }
      ]
    })

    // Save the AI response to the database
    const aiTimestamp = new Date().toISOString()
    const { error: aiSaveError } = await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "ai",
      content: aiResponse,
      timestamp: aiTimestamp
    })

    if (aiSaveError) {
      console.error("Error saving AI response:", aiSaveError)
      // Continue anyway to provide a response to the user
    }

    return NextResponse.json({
      success: true,
      message: aiResponse,
      timestamp: aiTimestamp
    })
  } catch (error: any) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
