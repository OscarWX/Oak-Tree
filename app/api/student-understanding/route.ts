import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const lessonId = request.nextUrl.searchParams.get("lessonId")
    
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 })
    }

    // Get all multiple choice attempts for this lesson to calculate understanding
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from("multiple_choice_attempts")
      .select(`
        *,
        students!inner(id, name)
      `)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false })

    if (attemptsError) {
      console.error("Error fetching attempts data:", attemptsError)
      return NextResponse.json({ error: "Failed to fetch attempts data" }, { status: 500 })
    }

    // Get session data for completion information
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("chat_sessions")
      .select(`
        id,
        student_id,
        lesson_id,
        status,
        started_at,
        ended_at,
        summary
      `)
      .eq("lesson_id", lessonId)

    if (sessionsError) {
      console.error("Error fetching sessions data:", sessionsError)
    }

    // Calculate understanding from actual attempt data
    const studentMap = new Map()
    const conceptWrongCounts = new Map() // Track wrong attempts per student per concept
    
    attempts?.forEach((attempt) => {
      const studentId = attempt.student_id
      const studentName = attempt.students.name
      const concept = attempt.concept
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: studentId,
          name: studentName,
          concepts: [],
          totalLevel: 0,
          conceptCount: 0,
          strengths: [],
          misunderstandings: [],
          lastActivity: attempt.created_at
        })
      }
      
      const student = studentMap.get(studentId)
      
      // Update last activity
      if (attempt.created_at > student.lastActivity) {
        student.lastActivity = attempt.created_at
      }

      // Track wrong attempts per concept
      const conceptKey = `${studentId}-${concept}`
      if (!conceptWrongCounts.has(conceptKey)) {
        conceptWrongCounts.set(conceptKey, { 
          studentId, 
          concept, 
          wrongCount: 0, 
          totalAttempts: 0 
        })
      }
      
      const conceptData = conceptWrongCounts.get(conceptKey)
      conceptData.totalAttempts++
      if (!attempt.is_correct) {
        conceptData.wrongCount++
      }
    })

    // Calculate understanding levels for each concept
    conceptWrongCounts.forEach((conceptData) => {
      const student = studentMap.get(conceptData.studentId)
      if (!student) return

      // Calculate understanding level (1-4 scale) based on wrong attempts
      let level
      if (conceptData.wrongCount === 0) {
        level = 4 // Perfect understanding
      } else if (conceptData.wrongCount === 1) {
        level = 3 // Good understanding
      } else if (conceptData.wrongCount <= 3) {
        level = 2 // Moderate understanding
      } else {
        level = 1 // Poor understanding
      }

      student.concepts.push({
        concept: conceptData.concept,
        level: level,
        wrongCount: conceptData.wrongCount,
        totalAttempts: conceptData.totalAttempts,
        noted_at: new Date().toISOString()
      })

      student.totalLevel += level
      student.conceptCount += 1

      // Categorize based on level
      if (level <= 2) {
        student.misunderstandings.push(conceptData.concept)
      } else {
        student.strengths.push(conceptData.concept)
      }
    })

    // Add session completion data
    sessions?.forEach((session) => {
      const student = studentMap.get(session.student_id)
      if (student) {
        student.sessionStatus = session.status
        student.sessionCompleted = session.status === 'completed'
        
        // Update last activity with session data if more recent
        const sessionDate = session.ended_at || session.started_at
        if (sessionDate > student.lastActivity) {
          student.lastActivity = sessionDate
        }
      }
    })

    // Convert to array and calculate percentages
    const students = Array.from(studentMap.values()).map(student => {
      // Convert level (1-4) to percentage (25%-100%)
      const averageLevel = student.conceptCount > 0 ? student.totalLevel / student.conceptCount : 0
      const understanding = Math.round((averageLevel / 4) * 100)
      
      return {
        ...student,
        understanding,
        averageLevel,
        lastActive: new Date(student.lastActivity).toLocaleDateString()
      }
    })

    // Calculate class average
    const classAverage = students.length > 0 ? 
      Math.round(students.reduce((sum, student) => sum + student.understanding, 0) / students.length) : 0

    // Find common misunderstandings
    const misunderstandingCounts = new Map()
    students.forEach(student => {
      student.misunderstandings.forEach((concept: string) => {
        misunderstandingCounts.set(concept, (misunderstandingCounts.get(concept) || 0) + 1)
      })
    })

    const commonMisunderstandings = Array.from(misunderstandingCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([concept, count]) => ({ concept, count }))

    return NextResponse.json({
      students,
      classAverage,
      commonMisunderstandings,
      totalStudents: students.length,
      message: "Understanding calculated from actual student attempts"
    })

  } catch (error: any) {
    console.error("Error in student understanding API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 