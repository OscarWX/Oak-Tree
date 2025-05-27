import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const lessonId = request.nextUrl.searchParams.get("lessonId")
    
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 })
    }

    // Get all student understanding data for this lesson
    const { data: understandingData, error: understandingError } = await supabaseAdmin
      .from("student_understanding")
      .select(`
        *,
        students!inner(id, name)
      `)
      .eq("lesson_id", lessonId)
      .order("noted_at", { ascending: false })

    if (understandingError) {
      console.error("Error fetching understanding data:", understandingError)
      return NextResponse.json({ error: "Failed to fetch understanding data" }, { status: 500 })
    }

    // Group by student and calculate overall understanding
    const studentMap = new Map()
    
    understandingData?.forEach((record) => {
      const studentId = record.student_id
      const studentName = record.students.name
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: studentId,
          name: studentName,
          concepts: [],
          totalLevel: 0,
          conceptCount: 0,
          strengths: [],
          misunderstandings: []
        })
      }
      
      const student = studentMap.get(studentId)
      student.concepts.push({
        concept: record.concept,
        level: record.level,
        noted_at: record.noted_at
      })
      
      student.totalLevel += record.level
      student.conceptCount += 1
      
      // Categorize based on level (1-2 = misunderstanding, 3-4 = strength)
      if (record.level <= 2) {
        student.misunderstandings.push(record.concept)
      } else {
        student.strengths.push(record.concept)
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
        lastActive: student.concepts.length > 0 ? 
          new Date(Math.max(...student.concepts.map((c: any) => new Date(c.noted_at).getTime()))).toLocaleDateString() : 
          "No activity"
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
      totalStudents: students.length
    })

  } catch (error: any) {
    console.error("Error in student understanding API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 