import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Mock data for testing
const MOCK_STUDENTS = {
  "student1": {
    id: "student1",
    name: "Alex Johnson",
    email: "alex@example.com",
    created_at: new Date().toISOString()
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    // For testing with mock data
    if (MOCK_STUDENTS[id as keyof typeof MOCK_STUDENTS]) {
      return NextResponse.json({ student: MOCK_STUDENTS[id as keyof typeof MOCK_STUDENTS] })
    }

    const { data, error } = await supabaseAdmin.from("students").select("*").eq("id", id).single()

    if (error) {
      console.error("Database error:", error)
      
      // If we have a mock student with this ID, return it (fallback)
      if (id === "student1") {
        return NextResponse.json({ student: MOCK_STUDENTS.student1 })
      }
      
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ student: data })
  } catch (error: any) {
    console.error("Error fetching student:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
