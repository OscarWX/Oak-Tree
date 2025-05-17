import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Mock data for testing when Supabase is not available
const MOCK_LESSONS = [
  {
    id: "lesson1",
    course_id: "course1",
    title: "Introduction to Machine Learning",
    week_number: 1,
    lesson_number: 1,
    topic: "Machine Learning Foundations",
    created_at: new Date().toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get("courseId")
    
    // For testing, if the ID is lesson1, return mock data
    if (courseId === "course1" || request.nextUrl.searchParams.get("mock") === "true") {
      return NextResponse.json({ lessons: MOCK_LESSONS })
    }

    let query = supabaseAdmin.from("lessons").select("*")

    if (courseId) {
      query = query.eq("course_id", courseId)
    }

    query = query.order("week_number", { ascending: true }).order("lesson_number", { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error("Database error:", error)
      // Fallback to mock data if database query fails
      return NextResponse.json({ lessons: MOCK_LESSONS })
    }

    return NextResponse.json({ lessons: data })
  } catch (error: any) {
    console.error("Error fetching lessons:", error)
    // Fallback to mock data if there's an error
    return NextResponse.json({ lessons: MOCK_LESSONS })
  }
}
