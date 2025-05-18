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
    let rawAiResponse = null
    
    if (content && content.length > 10) {
      try {
        console.log("Generating AI analysis of content")
        
        // Trim content if it's extremely long to fit within API limits
        const trimmedContent = content.length > 100000 
          ? content.substring(0, 100000) + "... [content truncated due to length]" 
          : content
        
        const { text: analysisJson } = await generateText({
          model: openai("gpt-3.5-turbo"),
          prompt: `You are an education assistant tasked with analyzing learning materials.
          
CRITICAL INSTRUCTION: Your summary and key concepts must ONLY include information that is EXPLICITLY mentioned in the provided material. Do NOT add any new information, concepts, or examples.

Analyze the following learning material about ${lesson?.topic || "the subject"} and create:
1. A concise summary that ONLY contains information present in the material
2. A list of 2-3 key concepts that are EXPLICITLY mentioned and explained in the material

LEARNING MATERIAL:
${trimmedContent}

RULES FOR ANALYSIS:
- ONLY include information that is explicitly stated in the material
- Do NOT add any new concepts, explanations, or examples not present in the material
- Do NOT expand upon concepts using your own knowledge
- Do NOT make inferences beyond what is directly stated
- Extract the most important information verbatim or very closely paraphrased
- If something is unclear in the material, do not try to clarify it with external knowledge

Return your analysis as a JSON object with the following structure:
{
  "summary": "A summary that ONLY includes information directly from the material",
  "key_concepts": [
    {"concept": "Key concept 1 (from material)", "description": "Description using ONLY information from the material"},
    {"concept": "Key concept 2 (from material)", "description": "Description using ONLY information from the material"}
    // etc.
  ]
}

Only return the JSON object, nothing else.`,
        })
        
        // Store the raw AI response
        rawAiResponse = analysisJson;
        console.log("Raw AI response:", analysisJson.substring(0, 300));
        
        // Parse the AI response with safer error handling
        try {
          // Clean the response - sometimes the AI might add extra text around the JSON
          let jsonStr = analysisJson.trim();
          // Find the first '{' and the last '}' to extract just the JSON part
          const startIdx = jsonStr.indexOf('{');
          const endIdx = jsonStr.lastIndexOf('}');
          
          if (startIdx >= 0 && endIdx > startIdx) {
            jsonStr = jsonStr.substring(startIdx, endIdx + 1);
          }
          
          const analysis = JSON.parse(jsonStr);
          
          // Validate the structure of the response
          if (typeof analysis.summary === 'string') {
            aiSummary = analysis.summary;
            
            // Handle different potential formats of key_concepts
            if (Array.isArray(analysis.key_concepts)) {
              // Make sure each item has both concept and description
              keyConcepts = analysis.key_concepts.map((item: any) => {
                if (typeof item === 'string') {
                  // If it's just a string, convert to proper format
                  return { concept: item, description: "" };
                } else if (typeof item === 'object' && item !== null) {
                  // Ensure required properties exist
                  return {
                    concept: item.concept || item.name || item.key || item.title || "Unnamed Concept",
                    description: item.description || item.desc || item.explanation || ""
                  };
                } else {
                  // Fallback for unexpected format
                  return { concept: "Unknown Concept", description: "" };
                }
              });
            } else if (typeof analysis.key_concepts === 'object' && analysis.key_concepts !== null) {
              // Handle if key_concepts is an object instead of array
              keyConcepts = Object.entries(analysis.key_concepts).map(([key, value]) => ({
                concept: key,
                description: typeof value === 'string' ? value : JSON.stringify(value)
              }));
            } else {
              // Fallback if key_concepts is missing or invalid
              console.error("Invalid key_concepts format:", typeof analysis.key_concepts);
              keyConcepts = [{concept: "No key concepts available", description: ""}];
            }
            
            console.log("AI analysis generated successfully with", keyConcepts.length, "key concepts");
          } else {
            console.error("AI response missing expected fields:", analysisJson.substring(0, 200))
            aiSummary = "Error: Could not generate summary from AI response"
            keyConcepts = [{concept: "Error processing response", description: ""}];
          }
        } catch (parseError) {
          console.error("Failed to parse AI response:", parseError, "Response:", analysisJson.substring(0, 200))
          aiSummary = "Error: Could not parse AI response"
          keyConcepts = [{concept: "Error parsing AI response", description: ""}];
        }
      } catch (aiError: any) {
        console.error("Error generating AI analysis:", aiError)
        aiSummary = "Error generating analysis: " + (aiError.message || "Unknown error")
        keyConcepts = []
      }
    } else {
      console.log("Content too short or missing, skipping AI analysis")
      aiSummary = "No content analysis available"
      keyConcepts = []
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
        raw_ai_summary: rawAiResponse,
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
