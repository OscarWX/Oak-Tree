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
    // For testing, return mock data
    if (request.nextUrl.searchParams.get("mock") === "true") {
      return NextResponse.json({ students: MOCK_STUDENTS })
    }
    
    const { data, error } = await supabaseAdmin.from("students").select("*")

    if (error) {
      console.error("Database error:", error)
      // Return mock data if database query fails
      return NextResponse.json({ students: MOCK_STUDENTS })
    }

    return NextResponse.json({ students: data.length > 0 ? data : MOCK_STUDENTS })
  } catch (error: any) {
    console.error("Error fetching students:", error)
    return NextResponse.json({ students: MOCK_STUDENTS })
  }
}
