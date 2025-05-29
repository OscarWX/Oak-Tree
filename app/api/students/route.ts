import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Mock data for testing
const MOCK_STUDENTS = [
  {
    id: "student1",
    name: "Alex Johnson",
    email: "alex@example.com",
    created_at: new Date().toISOString()
  },
  {
    id: "student2",
    name: "Taylor Smith",
    email: "taylor@example.com",
    created_at: new Date().toISOString()
  },
  {
    id: "student3",
    name: "Jordan Lee",
    email: "jordan@example.com",
    created_at: new Date().toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    const lessonId = request.nextUrl.searchParams.get("lessonId")
    
    // For testing, return mock data
    if (request.nextUrl.searchParams.get("mock") === "true") {
      return NextResponse.json({ students: MOCK_STUDENTS })
    }

    if (lessonId) {
      // Get students who have interacted with this specific lesson
      const { data, error } = await supabaseAdmin
        .from("chat_sessions")
        .select(`
          student_id,
          students!inner(
            id,
            name,
            email,
            created_at
          )
        `)
        .eq("lesson_id", lessonId)

      if (error) {
        console.error("Database error:", error)
        return NextResponse.json({ students: MOCK_STUDENTS })
      }

      // Remove duplicates and extract student data
      const uniqueStudents = data
        .reduce((acc, session) => {
          const student = session.students as any
          if (!acc.some((s: any) => s.id === student.id)) {
            acc.push(student)
          }
          return acc
        }, [] as any[])

      return NextResponse.json({ 
        students: uniqueStudents.length > 0 ? uniqueStudents : MOCK_STUDENTS 
      })
    } else {
      // Get all students
      const { data, error } = await supabaseAdmin.from("students").select("*")

      if (error) {
        console.error("Database error:", error)
        return NextResponse.json({ students: MOCK_STUDENTS })
      }

      return NextResponse.json({ students: data.length > 0 ? data : MOCK_STUDENTS })
    }
  } catch (error: any) {
    console.error("Error fetching students:", error)
    return NextResponse.json({ students: MOCK_STUDENTS })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("students")
      .insert({ name, email })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Student with this email already exists" },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ student: data }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating student:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create student" },
      { status: 500 }
    )
  }
}
