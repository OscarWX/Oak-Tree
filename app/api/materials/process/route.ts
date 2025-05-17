import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { materialId } = await request.json()

    if (!materialId) {
      return NextResponse.json({ error: "Material ID is required" }, { status: 400 })
    }

    // Get the material from the database
    const { data: material, error: materialError } = await supabaseAdmin
      .from("materials")
      .select("*, lessons(*)")
      .eq("id", materialId)
      .single()

    if (materialError || !material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 })
    }

    // Extract content based on material type
    let contentToAnalyze = ""
    
    if (material.content_type === "text") {
      // Use the stored text content
      contentToAnalyze = material.content || ""
    } else if (material.file_url) {
      // For files, we could implement file parsing here
      // This would depend on file type (PDF, Word, etc.)
      // For now, we'll use a placeholder message
      contentToAnalyze = `[This is content from file: ${material.file_url}]`
      
      // TODO: Implement file content extraction
      // Options:
      // 1. For PDFs: Use a PDF parsing library or a dedicated API
      // 2. For supported document types: Use a document parsing service
      // 3. For images: Use OCR via AI vision models
    }

    if (!contentToAnalyze) {
      return NextResponse.json({ error: "No content to analyze" }, { status: 400 })
    }

    // Use AI to summarize the material and extract key concepts
    const { text: analysisJson } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are an education assistant tasked with analyzing learning materials.
      
      Analyze the following learning material about ${material.lessons?.topic || "the subject"} and create:
      1. A concise summary of the main ideas
      2. A list of 5-10 key concepts that students should understand
      
      LEARNING MATERIAL:
      ${contentToAnalyze}
      
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
    let analysis
    try {
      analysis = JSON.parse(analysisJson)
    } catch (e) {
      console.error("Failed to parse AI response:", e)
      return NextResponse.json({ error: "Failed to process material" }, { status: 500 })
    }

    // Update the material with the AI-generated summary and key concepts
    const { data: updatedMaterial, error: updateError } = await supabaseAdmin
      .from("materials")
      .update({
        ai_summary: analysis.summary,
        key_concepts: analysis.key_concepts
      })
      .eq("id", materialId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating material:", updateError)
      return NextResponse.json({ error: "Failed to update material with analysis" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      material: updatedMaterial,
      analysis
    })
  } catch (error: any) {
    console.error("Error processing material:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
} 