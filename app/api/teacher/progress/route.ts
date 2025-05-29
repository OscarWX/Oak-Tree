import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

interface StudentProgressData {
  student_id: string
  lesson_id: string
  student_name: string
  student_email: string
  session_id: string
  session_status: string
  started_at: string
  ended_at: string | null
  total_concepts: number
  current_progress: number
  completion_percentage: number
  wrong_answers_count: number
  understanding_level: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    const lessonId = searchParams.get('lessonId')
    const courseId = searchParams.get('courseId')

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    // Build the sessions query with proper teacher filtering
    let sessionQuery = supabaseAdmin
      .from('chat_sessions')
      .select(`
        id,
        student_id,
        lesson_id,
        started_at,
        ended_at,
        status,
        summary,
        understanding_level,
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

    if (lessonId) {
      sessionQuery = sessionQuery.eq('lesson_id', lessonId)
    }

    if (courseId) {
      sessionQuery = sessionQuery.eq('lessons.course_id', courseId)
    }

    const { data: sessions, error: sessionError } = await sessionQuery
      .order('started_at', { ascending: false })

    if (sessionError) {
      console.error("Error fetching session data:", sessionError)
      return NextResponse.json({ error: "Failed to fetch session data" }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        conceptProgress: [],
        sessionStats: [],
        summary: {
          totalSessions: 0,
          completedSessions: 0,
          averageUnderstanding: "0"
        }
      })
    }

    // Get ALL multiple choice attempts for these sessions
    const sessionIds = sessions.map(s => s.id)
    const { data: allAttempts, error: attemptsError } = await supabaseAdmin
      .from('multiple_choice_attempts')
      .select('*')
      .in('session_id', sessionIds)

    if (attemptsError) {
      console.error("Error fetching attempts data:", attemptsError)
    }

    // Process each session to build student progress data
    const studentProgressMap = new Map<string, StudentProgressData>()
    const conceptProgressMap = new Map<string, any>() // New: Track by student+concept

    sessions.forEach((session: any) => {
      const studentId = session.student_id
      
      // Parse session state to get progress information
      let totalConcepts = 0
      let currentProgress = 0
      let completionPercentage = 0

      if (session.summary) {
        try {
          const sessionState = JSON.parse(session.summary)
          if (sessionState.questions) {
            totalConcepts = sessionState.questions.length
            const currentIndex = sessionState.currentQuestionIndex || 0
            
            if (session.status === 'completed') {
              currentProgress = totalConcepts
              completionPercentage = 100
            } else {
              // Calculate based on current phase and index
              currentProgress = sessionState.currentPhase === 'example' ? currentIndex : Math.max(0, currentIndex - 1)
              completionPercentage = totalConcepts > 0 ? Math.round((currentProgress / totalConcepts) * 100) : 0
            }
          }
        } catch (e) {
          console.error("Error parsing session state:", e)
        }
      }

      // Count wrong answers for this session
      const sessionAttempts = allAttempts?.filter(a => a.session_id === session.id) || []
      const wrongAnswersCount = sessionAttempts.filter(a => !a.is_correct).length

      // Calculate understanding level based on wrong answers
      let understanding_level = 5 // Default to excellent
      if (wrongAnswersCount > 4) {
        understanding_level = 1 // Struggling
      } else if (wrongAnswersCount > 2) {
        understanding_level = 2 // Needs improvement
      } else if (wrongAnswersCount > 1) {
        understanding_level = 3 // Partial understanding
      } else if (wrongAnswersCount === 1) {
        understanding_level = 4 // Good
      }
      // wrongAnswersCount === 0 stays at 5 (excellent)

      studentProgressMap.set(studentId, {
        student_id: studentId,
        lesson_id: session.lesson_id,
        student_name: session.students?.name || 'Unknown Student',
        student_email: session.students?.email || 'No email',
        session_id: session.id,
        session_status: session.status,
        started_at: session.started_at,
        ended_at: session.ended_at,
        total_concepts: totalConcepts,
        current_progress: currentProgress,
        completion_percentage: completionPercentage,
        wrong_answers_count: wrongAnswersCount,
        understanding_level: understanding_level
      })

      // NEW: Group attempts by concept for detailed breakdown
      sessionAttempts.forEach(attempt => {
        const conceptKey = `${studentId}-${attempt.concept}`
        
        if (!conceptProgressMap.has(conceptKey)) {
          conceptProgressMap.set(conceptKey, {
            student_id: studentId,
            lesson_id: session.lesson_id,
            concept: attempt.concept,
            phase: session.status === 'completed' ? 'completed' : 'active',
            attempts: 0,
            completed_at: session.ended_at,
            understanding_level: understanding_level,
            lesson_topic: 'Current Lesson',
            students: { name: session.students?.name || 'Unknown Student', email: session.students?.email || 'No email' },
            lessons: { title: 'Current Lesson', topic: 'Current Topic' },
            completionPercentage: completionPercentage,
            conceptsCompleted: currentProgress,
            totalConcepts: totalConcepts,
            wrongAnswersCount: 0
          })
        }
        
        const conceptProgress = conceptProgressMap.get(conceptKey)
        conceptProgress.attempts++
        if (!attempt.is_correct) {
          conceptProgress.wrongAnswersCount++
        }
        
        // Recalculate understanding level for this specific concept
        const conceptWrongCount = conceptProgress.wrongAnswersCount
        if (conceptWrongCount === 0) {
          conceptProgress.understanding_level = 5
        } else if (conceptWrongCount === 1) {
          conceptProgress.understanding_level = 4
        } else if (conceptWrongCount <= 2) {
          conceptProgress.understanding_level = 3
        } else if (conceptWrongCount <= 4) {
          conceptProgress.understanding_level = 2
        } else {
          conceptProgress.understanding_level = 1
        }
      })
    })

    // Convert concept progress to array
    const conceptProgress = Array.from(conceptProgressMap.values())

    // If no concept-specific data exists, create overall progress entries
    if (conceptProgress.length === 0) {
      Array.from(studentProgressMap.values()).forEach(student => {
        conceptProgress.push({
          student_id: student.student_id,
          lesson_id: student.lesson_id,
          concept: 'Overall Progress',
          phase: student.session_status === 'completed' ? 'completed' : 'active',
          attempts: 1,
          completed_at: student.ended_at,
          understanding_level: student.understanding_level,
          lesson_topic: 'Current Lesson',
          students: { name: student.student_name, email: student.student_email },
          lessons: { title: 'Current Lesson', topic: 'Current Topic' },
          completionPercentage: student.completion_percentage,
          conceptsCompleted: student.current_progress,
          totalConcepts: student.total_concepts,
          wrongAnswersCount: student.wrong_answers_count
        })
      })
    }

    // Calculate summary statistics
    const totalSessions = Array.from(studentProgressMap.values()).length
    const completedSessions = Array.from(studentProgressMap.values()).filter(s => s.session_status === 'completed').length
    const averageUnderstanding = totalSessions > 0 
      ? (Array.from(studentProgressMap.values()).reduce((sum, s) => sum + s.understanding_level, 0) / totalSessions).toFixed(1)
      : "0"

    const responseData = {
      conceptProgress: conceptProgress,
      sessionStats: Array.from(studentProgressMap.values()),
      summary: {
        totalSessions: totalSessions,
        completedSessions: completedSessions,
        averageUnderstanding: averageUnderstanding
      }
    }

    return NextResponse.json(responseData)
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
          ended_at,
          status
        )
      `)
      .eq('chat_sessions.student_id', studentId)
      .eq('chat_sessions.lesson_id', lessonId)
      .order('timestamp', { ascending: true })

    if (chatError) {
      console.error("Error fetching chat history:", chatError)
      return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
    }

    // Get multiple choice attempts for this student/lesson
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('multiple_choice_attempts')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)

    if (attemptsError) {
      console.error("Error fetching attempts data:", attemptsError)
    }

    // Calculate understanding from actual attempts
    const conceptUnderstanding = new Map<string, { concept: string; level: number; wrong_count: number }>()
    
    attempts?.forEach((attempt: any) => {
      const concept = attempt.concept
      if (!conceptUnderstanding.has(concept)) {
        conceptUnderstanding.set(concept, { concept, level: 5, wrong_count: 0 })
      }
      
      if (!attempt.is_correct) {
        const data = conceptUnderstanding.get(concept)!
        data.wrong_count++
        
        // Calculate level based on wrong attempts
        if (data.wrong_count <= 1) data.level = 5
        else if (data.wrong_count <= 2) data.level = 4
        else if (data.wrong_count <= 3) data.level = 3
        else if (data.wrong_count <= 4) data.level = 2
        else data.level = 1
      }
    })

    return NextResponse.json({
      chatHistory: chatHistory || [],
      understanding: Array.from(conceptUnderstanding.values()).map(u => ({
        concept: u.concept,
        level: u.level,
        noted_at: new Date().toISOString()
      })),
      conceptTracking: [], // No longer needed
      lesson: lesson
    })
  } catch (error: any) {
    console.error("Error in detailed progress endpoint:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 