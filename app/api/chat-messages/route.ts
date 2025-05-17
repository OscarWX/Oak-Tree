import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Mock data for testing
const MOCK_MESSAGES = [
  {
    id: "msg1",
    session_id: "session1",
    sender_type: "ai",
    content: "Hello! I'm OakTree, your AI study buddy. How can I help you with today's machine learning lesson?",
    timestamp: new Date().toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId")
    
    // Return mock data for testing
    if (request.nextUrl.searchParams.get("mock") === "true" || sessionId === "session1") {
      return NextResponse.json({ messages: MOCK_MESSAGES })
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ messages: MOCK_MESSAGES })
    }

    return NextResponse.json({ messages: data })
  } catch (error: any) {
    console.error("Error fetching chat messages:", error)
    return NextResponse.json({ messages: MOCK_MESSAGES })
  }
} 