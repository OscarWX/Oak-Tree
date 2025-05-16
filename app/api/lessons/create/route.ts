import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Log request details for debugging
    console.log("Received lesson creation request")
    
    const payload = await request.json()
    console.log("Request payload:", payload)
    
    const { courseId, title, weekNumber, lessonNumber, topic } = payload

    // Validate required fields
    if (!courseId || !title || typeof weekNumber !== 'number' || typeof lessonNumber !== 'number' || !topic) {
      console.error("Validation error:", { courseId, title, weekNumber, lessonNumber, topic })
      return NextResponse.json({ 
        error: "Missing or invalid required fields", 
        details: { 
          courseId: !courseId ? "missing" : "valid", 
          title: !title ? "missing" : "valid", 
          weekNumber: typeof weekNumber !== 'number' ? `invalid type: ${typeof weekNumber}` : "valid", 
          lessonNumber: typeof lessonNumber !== 'number' ? `invalid type: ${typeof lessonNumber}` : "valid", 
          topic: !topic ? "missing" : "valid" 
        } 
      }, { status: 400 })
    }

    // Check if course exists
    console.log("Checking if course exists:", courseId)
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single()

    if (courseError) {
      console.error("Course check error:", courseError)
      return NextResponse.json({ error: `Course not found: ${courseError.message}` }, { status: 404 })
    }

    // Create new lesson
    console.log("Creating new lesson with data:", {
      course_id: courseId,
      title,
      week_number: weekNumber,
      lesson_number: lessonNumber,
      topic,
    })
    
    const { data: lesson, error } = await supabaseAdmin
      .from("lessons")
      .insert({
        course_id: courseId,
        title,
        week_number: weekNumber,
        lesson_number: lessonNumber,
        topic,
      })
      .select()
      .single()

    if (error) {
      console.error("Lesson creation error:", error)
      return NextResponse.json({ 
        error: `Failed to create lesson: ${error.message}`, 
        details: error,
        code: error.code
      }, { status: 500 })
    }

    console.log("Lesson created successfully:", lesson)
    return NextResponse.json({
      success: true,
      lesson,
    })
  } catch (error: any) {
    console.error("Error creating lesson:", error)
    return NextResponse.json({ 
      error: `Failed to create lesson: ${error.message || "Unknown error"}`,
      stack: error.stack
    }, { status: 500 })
  }
}
