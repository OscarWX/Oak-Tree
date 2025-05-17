import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { extractTextFromFile } from "@/lib/document-parser"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const runtime = "nodejs"

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
      
      // Extract text from the file BEFORE uploading to storage
      console.log("Extracting text from the uploaded file")
      try {
        // Convert the File object to a Buffer for our document parser
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Extract text based on file type
        content = await extractTextFromFile(buffer, file.name, file.type)
        console.log(`Successfully extracted ${content.length} characters of text`)
      } catch (extractError: any) {
        console.error("Error extracting text:", extractError)
        // Continue without extracted text
        content = `[Failed to extract text from ${file.name}: ${extractError.message || "Unknown error"}]`
      }
      
      // Generate a unique file name to prevent collisions
      const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      fileName = `${uniquePrefix}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      try {
        // Check if the materials bucket exists - but don't try to create it if it doesn't
        // The bucket should be created in Supabase dashboard instead
        const { data: buckets } = await supabaseAdmin.storage.listBuckets()
        const materialsBucket = buckets?.find(bucket => bucket.name === "materials")
        
        if (!materialsBucket) {
          console.log("Materials bucket doesn't exist. Attempting to use it anyway...")
          // Note: We don't try to create it here as it might cause RLS policy errors
          // The bucket should be created manually in the Supabase dashboard
        }
        
        // Upload file to Supabase Storage
        console.log(`Uploading file to materials bucket: ${fileName}`)
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from("materials")
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`)
        }

        // Get public URL for the uploaded file
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("materials")
          .getPublicUrl(fileName)

        fileUrl = publicUrl
        console.log("File uploaded successfully:", fileUrl)
        
      } catch (storageError: any) {
        console.error("Storage error:", storageError)
        return NextResponse.json({ 
          error: `Storage error: ${storageError.message}`,
          detail: storageError
        }, { status: 500 })
      }
    }

    // Get lesson info for AI context
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single()
    
    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      // Continue anyway - we'll just have less context for AI
    }
    
    // Generate AI analysis of the content if we have content
    let aiSummary = null
    let keyConcepts = null
    
    if (content && content.length > 10) {
      try {
        console.log("Generating AI analysis of content")
        
        const { text: analysisJson } = await generateText({
          model: openai("gpt-3.5-turbo"),
          prompt: `You are an education assistant tasked with analyzing learning materials.
          
          Analyze the following learning material about ${lesson?.topic || "the subject"} and create:
          1. A concise summary of the main ideas
          2. A list of 5-10 key concepts that students should understand
          
          LEARNING MATERIAL:
          ${content}
          
          Return your analysis as a JSON object with the following structure:
          {
            "summary": "A comprehensive summary of the material in 3-5 paragraphs",
            "key_concepts": [
              {"concept": "Key concept 1", "description": "Brief explanation of this concept"},
              {"concept": "Key concept 2", "description": "Brief explanation of this concept"}
              // etc.
            ]
          }
          
          Only return the JSON object, nothing else.`,
        })
        
        // Parse the AI response
        const analysis = JSON.parse(analysisJson)
        aiSummary = analysis.summary
        keyConcepts = analysis.key_concepts
        
        console.log("AI analysis generated successfully")
      } catch (aiError: any) {
        console.error("Error generating AI analysis:", aiError)
        // Continue without AI analysis
      }
    }

    // Save material metadata to database
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
        ai_summary: aiSummary,
        key_concepts: keyConcepts,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      // If we've uploaded a file but failed to save to database, try to clean up
      if (fileName && fileUrl) {
        await supabaseAdmin.storage
          .from("materials")
          .remove([fileName])
          .then(() => console.log("Removed orphaned file after database error"))
          .catch(err => console.error("Failed to remove orphaned file:", err))
      }
      
      console.error("Database error:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    console.log("Material saved successfully:", material.id)
    
    return NextResponse.json({
      success: true,
      material,
      message: "Material saved successfully with extracted text and analysis"
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
