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
      .map((msg) => `${msg.sender_type === "ai" ? msg.content : `Student: ${msg.content}`}`)
      .join("\n\n")

    // Get lesson data for analysis context
    const { data: lessonData, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("ai_summary, key_concepts")
      .eq("id", session.lesson_id)
      .single()

    // Get materials for the lesson to know what concepts should be understood
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("title, ai_summary, key_concepts")
      .eq("lesson_id", session.lesson_id)

    if (materialsError) {
      return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
    }

    // Extract key concepts from lesson and materials
    interface KeyConcept {
      concept: string;
      description?: string;
    }
    
    let allKeyConcepts: KeyConcept[] = [];
    
    // Add lesson key concepts
    if (lessonData && lessonData.key_concepts && Array.isArray(lessonData.key_concepts)) {
      allKeyConcepts = [...lessonData.key_concepts] as KeyConcept[];
    }
    
    // Add material key concepts
    if (materials && materials.length > 0) {
      materials.forEach(material => {
        if (material.key_concepts && Array.isArray(material.key_concepts)) {
          allKeyConcepts = [...allKeyConcepts, ...(material.key_concepts as KeyConcept[])];
        }
      });
    }
    
    // Remove duplicates by concept name
    const uniqueConcepts = Array.from(
      new Map(allKeyConcepts.map(item => [item.concept, item])).values()
    );

    // Create a list of key concepts for assessment
    const conceptsList = uniqueConcepts
      .map(c => `- ${c.concept}: ${c.description || ""}`)
      .join("\n");

    // Generate understanding analysis
    const { text: analysisJson } = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `Analyze this chat between a student and two bird characters (Chirpy and Sage) about ${session.lessons.topic}.

      CHAT HISTORY:
      ${formattedHistory}
      
      KEY CONCEPTS THAT SHOULD BE UNDERSTOOD:
      ${conceptsList}
      
      Based on the student's explanations in the chat, evaluate their understanding of the topic.
      
      Return your analysis as a JSON object with the following structure:
      {
        "understanding_level": [number between 0-100, with 0 being no understanding and 100 being perfect understanding],
        "strengths": [array of specific concepts the student explained well],
        "misunderstandings": [array of specific concepts the student struggled with or has misconceptions about],
        "summary": [2-3 paragraph summary of the student's understanding, highlighting strong points and areas for improvement]
      }
      
      IMPORTANT RULES FOR EVALUATION:
      1. Focus ONLY on what the student actually said in the chat
      2. Base your evaluation on how well they were able to explain concepts to Chirpy
      3. Consider whether Sage had to intervene to correct misunderstandings
      4. Be fair and objective - don't assume understanding beyond what was demonstrated
      5. A higher score should reflect accurate explanations of more key concepts
      
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

    // Generate a cheerful goodbye message from Chirpy
    let goodbyeMessage = "Chirpy: *jumps up and down excitedly* Thank you so much for teaching me today! I've learned so much from you about " + 
      session.lessons.topic + "! You're a great teacher! *chirps happily* I hope we can talk again soon! Bye for now!";

    // Save the goodbye message
    const timestamp = new Date().toISOString()
    await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "ai",
      content: goodbyeMessage,
      timestamp
    })

    // Update the session with the analysis
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({
        ended_at: new Date().toISOString(),
        understanding_level: analysis.understanding_level,
        strengths: analysis.strengths,
        misunderstandings: analysis.misunderstandings,
        summary: analysis.summary,
        status: "completed"
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
      goodbyeMessage
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
