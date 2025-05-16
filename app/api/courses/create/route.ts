import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { title, description } = await request.json()

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 })
    }

    // Get the teacher ID (in a real app, this would come from authentication)
    // For now, we'll use the default teacher ID from our database
    const teacherId = "00000000-0000-0000-0000-000000000001"

    // Create new course
    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .insert({
        title,
        description,
        teacher_id: teacherId,
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      course,
    })
  } catch (error: any) {
    console.error("Error creating course:", error)
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }
}
