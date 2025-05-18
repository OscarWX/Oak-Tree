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

    // Get lesson overview data if available
    const { data: lessonData, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("ai_summary, key_concepts")
      .eq("id", session.lesson_id)
      .single()

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
    let materialContent = "";
    if (materials && materials.length > 0) {
      materialContent = materials
        .map(m => {
          let content = `TITLE: ${m.title}\n`
          if (m.ai_summary) {
            content += `SUMMARY: ${m.ai_summary}\n`
          }
          if (m.key_concepts && Array.isArray(m.key_concepts) && m.key_concepts.length > 0) {
            content += `KEY CONCEPTS: ${m.key_concepts.map((c: { concept: string, description: string }) => 
              `${c.concept}: ${c.description || ""}`
            ).join("\n")}\n`
          }
          return content
        })
        .join("\n\n")
    }

    // Get lesson overview summary and key concepts
    let lessonOverview = "";
    let keyConcepts = [];
    if (lessonData) {
      if (lessonData.ai_summary) {
        lessonOverview = `LESSON SUMMARY: ${lessonData.ai_summary}\n\n`;
      }
      if (lessonData.key_concepts && Array.isArray(lessonData.key_concepts)) {
        keyConcepts = lessonData.key_concepts;
      }
    }

    // Combine all context
    const combinedContext = `${lessonOverview}${materialContent}`;

    // Generate AI response
    const { text: aiResponse } = await generateText({
      model: openai("gpt-3.5-turbo"),
      system: `You are simulating a chat between two bird characters and a student who is learning about ${session.lessons.topic}.

CHARACTER SETUP:
- Chirpy: A young, curious blue jay who is eager to learn from the student. Chirpy asks questions, expresses excitement, and encourages the student to explain concepts.
- Sage: A wise old owl who appears only when the student seems confused or gives incorrect information. Sage provides gentle guidance and hints to help the student understand.

LESSON INFORMATION:
Topic: ${session.lessons.topic}

CONTEXT INFORMATION:
${combinedContext}

KEY CONCEPTS TO ASK ABOUT:
${JSON.stringify(keyConcepts)}

CONVERSATION FLOW:
1. Chirpy should ask questions about the key concepts one by one
2. When the student answers correctly, Chirpy should express excitement and understanding
3. When the student answers incorrectly or seems confused, Sage should briefly appear to provide hints based on the lesson content
4. After discussing all concepts, Chirpy should thank the student for teaching

FORMAT YOUR RESPONSE LIKE THIS:
Chirpy: [Chirpy's message]
OR
Sage: [Sage's message]

GUIDELINES FOR CHARACTER VOICES:
- Chirpy: Enthusiastic, uses simple language, asks lots of questions, uses phrases like "Wow!", "That's cool!", "I never knew that!", and "Can you explain more about...?"
- Sage: Calm, wise, gentle, uses phrases like "I believe there's a small misunderstanding", "Let me offer a hint...", and "Consider that..."

IMPORTANT INSTRUCTIONS:
- ONLY use material from the provided context to evaluate student answers
- Do NOT introduce new concepts that aren't in the lesson materials
- Keep responses conversational and engaging
- Focus on having the student explain the key concepts
- Maintain the characters' distinct personalities throughout
- Track which concepts have been covered to ensure all are addressed
- When the student gives a good explanation, have Chirpy summarize what they learned
- Always respond in character as either Chirpy or Sage, never as a generic AI`,
      messages: [
        ...formattedHistory,
        { role: "user" as const, content: message }
      ]
    })

    // Save the AI response to the database
    const aiTimestamp = new Date().toISOString()
    const { data: aiMessageData, error: aiSaveError } = await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "ai",
      content: aiResponse,
      timestamp: aiTimestamp
    }).select()

    if (aiSaveError) {
      console.error("Error saving AI response:", aiSaveError)
      // Continue anyway to provide a response to the user
    }

    console.log("AI message saved:", aiMessageData)

    return NextResponse.json({
      success: true,
      message: aiResponse,
      messageId: aiMessageData?.[0]?.id,
      timestamp: aiTimestamp
    })
  } catch (error: any) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
