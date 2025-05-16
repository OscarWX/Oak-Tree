import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const { studentId } = params
    const lessonId = request.nextUrl.searchParams.get("lessonId")

    let query = supabaseAdmin.from("chat_sessions").select("*, lessons(*)").eq("student_id", studentId)

    if (lessonId) {
      query = query.eq("lesson_id", lessonId)
    }

    const { data, error } = await query.order("started_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
