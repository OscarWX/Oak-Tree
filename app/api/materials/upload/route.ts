import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    console.log("Material upload request received")
    
    // Get form data from request
    const formData = await request.formData()
    const lessonId = formData.get("lessonId") as string
    const title = formData.get("title") as string
    const contentType = formData.get("contentType") as string

    console.log("Upload params:", { lessonId, title, contentType })

    if (!lessonId || !title || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Handle different content types
    let content: string | null = null
    let fileUrl: string | null = null
    let fileName: string | null = null

    if (contentType === "text") {
      // Handle text content
      content = formData.get("content") as string
      
      if (!content) {
        return NextResponse.json({ error: "No content provided" }, { status: 400 })
      }

      console.log("Text content received, length:", content.length)
    } else {
      // Handle file upload
      const file = formData.get("file") as File | null

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      console.log("File received:", file.name, file.type, file.size)
      fileName = file.name
      
      // Skip the actual file upload for now, just store the file name
      fileUrl = null
    }

    // Save material to database (without AI processing)
    console.log("Saving material to database")
    const { data: material, error } = await supabaseAdmin
      .from("materials")
      .insert({
        lesson_id: lessonId,
        title,
        content_type: contentType,
        content,
        file_url: fileUrl,
        file_name: fileName,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    console.log("Material saved successfully:", material.id)
    
    return NextResponse.json({
      success: true,
      material,
      message: "Material saved successfully"
    })
  } catch (error: any) {
    console.error("Error uploading material:", error)
    return NextResponse.json(
      {
        error: `Failed to upload material: ${error.message || "Unknown error"}`
      },
      { status: 500 },
    )
  }
}
