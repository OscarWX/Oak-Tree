import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { extractTextFromURL } from "@/lib/document-parser"

export const runtime = "nodejs"

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
    
    if (material.content) {
      // Use the content that's already in the database
      contentToAnalyze = material.content
      console.log(`Using existing content: ${contentToAnalyze.length} characters`)
    } else if (material.file_url && material.file_name) {
      try {
        // Extract text from the file using our document parser
        console.log(`Extracting text from file: ${material.file_name}`)
        contentToAnalyze = await extractTextFromURL(material.file_url, material.file_name)
        console.log(`Successfully extracted ${contentToAnalyze.length} characters of text`)
        
        // Save the extracted text to the database for future use
        const { error: updateError } = await supabaseAdmin
          .from("materials")
          .update({
            content: contentToAnalyze
          })
          .eq("id", materialId)
        
        if (updateError) {
          console.error("Error saving extracted text:", updateError)
        }
      } catch (extractError) {
        console.error("Error extracting text from file:", extractError)
        contentToAnalyze = `[Unable to extract text from file: ${material.file_name}]`
      }
    }

    if (!contentToAnalyze) {
      return NextResponse.json({ error: "No content to analyze" }, { status: 400 })
    }

    // Use AI to summarize the material and extract key concepts
    const { text: analysisJson } = await generateText({
      model: openai("gpt-3.5-turbo"),
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