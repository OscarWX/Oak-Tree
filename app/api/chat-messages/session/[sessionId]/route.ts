import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(_request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params

    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
