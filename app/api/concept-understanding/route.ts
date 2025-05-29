import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, lessonId, concept, answerType, isCorrect } = body

    // Validate required fields
    if (!studentId || !lessonId || !concept || !answerType) {
      return NextResponse.json(
        { error: "Missing required fields: studentId, lessonId, concept, answerType" },
        { status: 400 }
      )
    }

    // Only track wrong answers
    if (isCorrect) {
      return NextResponse.json({ message: "Correct answer, no tracking needed" })
    }

    // Get or create the concept understanding record
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from("concept_understanding_tracking")
      .select("*")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .eq("concept", concept)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError
    }

    if (existingRecord) {
      // Update existing record by incrementing the appropriate counter
      const updateField = answerType === "multiple_choice" 
        ? "wrong_multiple_choice_count" 
        : "wrong_example_count"

      const { data, error } = await supabaseAdmin
        .from("concept_understanding_tracking")
        .update({
          [updateField]: existingRecord[updateField] + 1,
          last_updated: new Date().toISOString()
        })
        .eq("id", existingRecord.id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ 
        message: "Concept understanding updated",
        data: data
      })
    } else {
      // Create new record
      const initialData = {
        student_id: studentId,
        lesson_id: lessonId,
        concept: concept,
        wrong_multiple_choice_count: answerType === "multiple_choice" ? 1 : 0,
        wrong_example_count: answerType === "example" ? 1 : 0
      }

      const { data, error } = await supabaseAdmin
        .from("concept_understanding_tracking")
        .insert(initialData)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ 
        message: "Concept understanding tracking created",
        data: data
      })
    }
  } catch (error: any) {
    console.error("Error tracking concept understanding:", error)
    return NextResponse.json(
      { error: error.message || "Failed to track concept understanding" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const studentId = url.searchParams.get("studentId")
    const lessonId = url.searchParams.get("lessonId")
    const concept = url.searchParams.get("concept")

    let query = supabaseAdmin.from("concept_understanding_tracking").select("*")

    if (studentId) {
      query = query.eq("student_id", studentId)
    }
    if (lessonId) {
      query = query.eq("lesson_id", lessonId)
    }
    if (concept) {
      query = query.eq("concept", concept)
    }

    const { data, error } = await query.order("last_updated", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error fetching concept understanding:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch concept understanding" },
      { status: 500 }
    )
  }
} 