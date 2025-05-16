import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*, lessons(*)")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    // Get all messages in this session
    const { data: chatHistory, error: historyError } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true })

    if (historyError) {
      return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
    }

    // Format chat history for AI
    const formattedHistory = chatHistory
      .map((msg) => `${msg.sender_type === "ai" ? "Oakie" : "Student"}: ${msg.content}`)
      .join("\n\n")

    // Get materials for the lesson to know what concepts should be understood
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("lesson_id", session.lesson_id)

    if (materialsError) {
      return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
    }

    // Extract key concepts from materials
    const keyConcepts = materials
      .flatMap((m) => m.key_concepts || [])
      .map((c) => c.concept)
      .join(", ")

    // Generate understanding analysis
    const { text: analysisJson } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Analyze this chat between a student and Oakie (an AI bird) about ${session.lessons.topic}.

      CHAT HISTORY:
      ${formattedHistory}
      
      KEY CONCEPTS THAT SHOULD BE UNDERSTOOD:
      ${keyConcepts}
      
      Based on the student's explanations, evaluate their understanding of the topic.
      
      Return your analysis as a JSON object with the following structure:
      {
        "understanding_level": [number between 0-100],
        "strengths": [array of concepts the student understands well],
        "misunderstandings": [array of concepts the student struggles with or has misconceptions about],
        "summary": [2-3 paragraph summary of the student's understanding]
      }
      
      Only return the JSON object, nothing else.`,
    })

    // Parse the analysis
    let analysis
    try {
      analysis = JSON.parse(analysisJson)
    } catch (e) {
      // Fallback if AI doesn't return valid JSON
      analysis = {
        understanding_level: 50,
        strengths: [],
        misunderstandings: [],
        summary: "Unable to generate proper analysis. Please review the chat manually.",
      }
    }

    // Update the session with the analysis
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({
        ended_at: new Date().toISOString(),
        understanding_level: analysis.understanding_level,
        strengths: analysis.strengths,
        misunderstandings: analysis.misunderstandings,
        summary: analysis.summary,
      })
      .eq("id", sessionId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: "Failed to update session with analysis" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analysis,
      session: updatedSession,
    })
  } catch (error) {
    console.error("Error ending chat session:", error)
    return NextResponse.json(
      {
        error: "Failed to end chat session",
      },
      { status: 500 },
    )
  }
}
