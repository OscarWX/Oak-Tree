import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    const lessonId = searchParams.get('lessonId')
    const courseId = searchParams.get('courseId')

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('student_concept_mastery')
      .select(`
        *,
        students!inner(name, email),
        lessons!inner(
          title,
          topic,
          course_id,
          courses!inner(
            title,
            teacher_id
          )
        )
      `)
      .eq('lessons.courses.teacher_id', teacherId)

    // Filter by specific lesson if provided
    if (lessonId) {
      query = query.eq('lesson_id', lessonId)
    }

    // Filter by specific course if provided
    if (courseId) {
      query = query.eq('lessons.course_id', courseId)
    }

    const { data: progressData, error } = await query.order('completed_at', { ascending: false })

    if (error) {
      console.error("Error fetching student progress:", error)
      return NextResponse.json({ error: "Failed to fetch student progress" }, { status: 500 })
    }

    // Get overall statistics
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('chat_sessions')
      .select(`
        id,
        student_id,
        lesson_id,
        started_at,
        ended_at,
        understanding_level,
        students!inner(name),
        lessons!inner(
          title,
          topic,
          course_id,
          courses!inner(
            title,
            teacher_id
          )
        )
      `)
      .eq('lessons.courses.teacher_id', teacherId)

    if (statsError) {
      console.error("Error fetching session stats:", statsError)
    }

    // Process the data for better frontend consumption
    const sessions = statsData || []
    const processedData = {
      conceptProgress: progressData || [],
      sessionStats: sessions,
      summary: {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.ended_at).length,
        averageUnderstanding: sessions.length > 0 
          ? (sessions.reduce((sum, s) => sum + (s.understanding_level || 0), 0) / sessions.length).toFixed(1)
          : "0"
      }
    }

    return NextResponse.json(processedData)
  } catch (error: any) {
    console.error("Error in teacher progress endpoint:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Get detailed progress for a specific student and lesson
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teacherId, studentId, lessonId } = body

    if (!teacherId || !studentId || !lessonId) {
      return NextResponse.json({ 
        error: "Teacher ID, Student ID, and Lesson ID are required" 
      }, { status: 400 })
    }

    // Verify teacher has access to this lesson
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select(`
        *,
        courses!inner(teacher_id)
      `)
      .eq('id', lessonId)
      .eq('courses.teacher_id', teacherId)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found or access denied" }, { status: 404 })
    }

    // Get detailed chat history
    const { data: chatHistory, error: chatError } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        chat_sessions!inner(
          student_id,
          lesson_id,
          started_at,
          ended_at
        )
      `)
      .eq('chat_sessions.student_id', studentId)
      .eq('chat_sessions.lesson_id', lessonId)
      .order('timestamp', { ascending: true })

    if (chatError) {
      console.error("Error fetching chat history:", chatError)
      return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
    }

    // Get student understanding levels
    const { data: understanding, error: understandingError } = await supabaseAdmin
      .from('student_understanding')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)

    if (understandingError) {
      console.error("Error fetching understanding data:", understandingError)
    }

    return NextResponse.json({
      chatHistory: chatHistory || [],
      understanding: understanding || [],
      lesson: lesson
    })
  } catch (error: any) {
    console.error("Error in detailed progress endpoint:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 