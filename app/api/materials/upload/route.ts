import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

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

      // First check if storage bucket exists, create if it doesn't
      const { data: buckets } = await supabaseAdmin.storage.listBuckets()
      
      if (!buckets?.find(bucket => bucket.name === "materials")) {
        console.log("Creating materials bucket")
        const { error: bucketError } = await supabaseAdmin.storage.createBucket("materials", {
          public: true
        })
        
        if (bucketError) {
          console.error("Error creating bucket:", bucketError)
          return NextResponse.json({ error: `Failed to create storage bucket: ${bucketError.message}` }, { status: 500 })
        }
      }
      
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      console.log("Uploading file:", fileName)
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("materials")
        .upload(fileName, file)

      if (uploadError) {
        console.error("File upload error:", uploadError)
        return NextResponse.json({ error: `File upload failed: ${uploadError.message}` }, { status: 500 })
      }

      // Get public URL for the uploaded file
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("materials").getPublicUrl(fileName)

      fileUrl = publicUrl
      console.log("File uploaded successfully:", publicUrl)

      // For PDFs, we would extract text here
      // This is a simplified version - in production you'd use a PDF parsing library
      if (file.type === "application/pdf") {
        // Placeholder for PDF text extraction
        content = "PDF content would be extracted here"
      }
    }

    // Use AI to generate summary and extract key concepts
    let aiSummary = ""
    let keyConcepts = []
    
    try {
      const textToAnalyze = content || "No content available for analysis"

      // Generate summary using AI
      console.log("Generating AI summary")
      const { text: summary } = await generateText({
        model: openai("gpt-4o"),
        prompt: `Summarize the following educational content in 3-5 paragraphs, focusing on the main concepts that students should understand:\n\n${textToAnalyze}`,
      })
      
      aiSummary = summary

      // Extract key concepts using AI
      console.log("Extracting key concepts")
      const { text: keyConceptsText } = await generateText({
        model: openai("gpt-4o"),
        prompt: `Extract 5-10 key concepts from the following educational content. Return as a JSON array of objects with "concept" and "description" fields:\n\n${textToAnalyze}`,
      })

      // Parse key concepts from AI response
      try {
        keyConcepts = JSON.parse(keyConceptsText)
      } catch (e) {
        // Fallback if AI doesn't return valid JSON
        console.error("Error parsing AI concepts:", e)
        keyConcepts = [{ concept: "Error parsing concepts", description: "Please check the material and try again" }]
      }
    } catch (aiError) {
      console.error("AI processing error:", aiError)
      // Continue without AI processing if it fails
      aiSummary = "AI summary generation failed"
      keyConcepts = [{ concept: "AI processing error", description: "Key concepts could not be generated" }]
    }

    // Save material to database
    console.log("Saving material to database")
    const { data: material, error } = await supabaseAdmin
      .from("materials")
      .insert({
        lesson_id: lessonId,
        title,
        content_type: contentType,
        content,
        file_url: fileUrl,
        ai_summary: aiSummary,
        key_concepts: keyConcepts,
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
      message: "Material uploaded and processed successfully",
    })
  } catch (error: any) {
    console.error("Error uploading material:", error)
    return NextResponse.json(
      {
        error: `Failed to upload material: ${error.message || "Unknown error"}`,
        stack: error.stack
      },
      { status: 500 },
    )
  }
}
