import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message } = body

    if (!sessionId || !message) {
      return NextResponse.json({ error: "Session ID and message are required" }, { status: 400 })
    }

    // For testing, simulate saving the user message and respond with an AI message
    const aiResponse = "That's really interesting! Can you tell me more about that concept?";

    // In a real app, we would save the messages to the database and generate a real AI response
    
    return NextResponse.json({
      success: true,
      userMessage: message,
      aiMessage: aiResponse
    })
  } catch (error: any) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
