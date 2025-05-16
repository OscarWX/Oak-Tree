import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId")

    // If studentId is provided, we'd fetch only courses this student is enrolled in
    // For simplicity, we're returning all courses for now
    // In a real app, you'd have an enrollments table to handle this relationship

    const { data, error } = await supabaseAdmin.from("courses").select("*")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ courses: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
