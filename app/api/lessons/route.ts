import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get("courseId")

    let query = supabaseAdmin.from("lessons").select("*")

    if (courseId) {
      query = query.eq("course_id", courseId)
    }

    query = query.order("week_number", { ascending: true }).order("lesson_number", { ascending: true })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lessons: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
