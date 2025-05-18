import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lessonId = params.id
    console.log("Starting summary generation for lesson ID:", lessonId)

    // 1. Get the lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("*, courses(*)")
      .eq("id", lessonId)
      .single()

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // 2. Get all materials for this lesson
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("title, ai_summary, key_concepts")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true })

    if (materialsError) {
      console.error("Error fetching materials:", materialsError)
      return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
    }

    if (!materials || materials.length === 0) {
      console.error("No materials found for lesson ID:", lessonId)
      return NextResponse.json({ error: "No materials found for this lesson" }, { status: 400 })
    }

    console.log(`Found ${materials.length} materials for lesson ID ${lessonId}`)

    // 3. Format the materials data for the AI
    const materialContents = materials.map(material => {
      let keyConceptsText = "";
      if (material.key_concepts && material.key_concepts.length > 0) {
        keyConceptsText = "Key concepts:\n" + material.key_concepts.map((concept: any) => 
          `- ${concept.concept}: ${concept.description || ""}`
        ).join("\n");
      }
      
      return `
MATERIAL: ${material.title}
${material.ai_summary || "No summary available"}
${keyConceptsText}
      `.trim();
    }).join("\n\n---\n\n");

    // 4. Generate the lesson summary and key concepts using AI
    console.log("Generating lesson summary from materials...");
    
    let analysisJson = "";
    try {
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: `You are an expert education assistant tasked with EXCLUSIVELY synthesizing provided learning materials.
        
CRITICAL INSTRUCTION: Your summary and key concepts must be STRICTLY based on the materials provided. Do NOT introduce any new information, concepts, or examples that are not explicitly mentioned in the provided materials.

Your task:
1. Create a comprehensive lesson summary that ONLY combines information from all the provided materials
2. Extract 5-7 key concepts that are EXPLICITLY mentioned in the materials

MATERIALS:
${materialContents}

RULES FOR SUMMARY CREATION:
- ONLY include information that is explicitly stated in the materials
- Do NOT add any new concepts, explanations, or examples not present in the materials
- Do NOT expand upon concepts with your own knowledge
- Do NOT make inferences beyond what is directly stated
- Organize and synthesize the existing information in a coherent way
- If the materials contain contradictions or differing perspectives, note these in your summary

Return your analysis as a JSON object with the following structure:
{
  "summary": "A comprehensive summary that ONLY includes information from the materials provided",
  "key_concepts": [
    {"concept": "Key concept 1 (from materials)", "description": "Description using ONLY information from materials"},
    {"concept": "Key concept 2 (from materials)", "description": "Description using ONLY information from materials"}
    // etc.
  ]
}

Only return the JSON object, nothing else.`,
      });
      
      analysisJson = text;
      console.log("Received AI response. Raw response length:", analysisJson.length);
      console.log("First 100 chars of raw response:", analysisJson.substring(0, 100));
    } catch (error) {
      console.error("Error generating text with AI:", error);
      return NextResponse.json({ error: "Failed to generate AI summary" }, { status: 500 });
    }
    
    // 5. Process the AI response
    let aiSummary = null;
    let keyConcepts = null;
    
    try {
      // Clean the response - sometimes the AI might add extra text around the JSON
      let jsonStr = analysisJson.trim();
      // Find the first '{' and the last '}' to extract just the JSON part
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      
      if (startIdx >= 0 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
        console.log("Extracted JSON string length:", jsonStr.length);
      } else {
        console.error("Could not find valid JSON in AI response");
        console.log("Full AI response:", analysisJson);
        return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
      }
      
      const analysis = JSON.parse(jsonStr);
      console.log("Successfully parsed JSON response");
      
      if (typeof analysis.summary === 'string') {
        aiSummary = analysis.summary;
        console.log("Found summary, length:", aiSummary.length);
        
        if (Array.isArray(analysis.key_concepts)) {
          console.log("Found key concepts array, count:", analysis.key_concepts.length);
          // Make sure each item has both concept and description
          keyConcepts = analysis.key_concepts.map((item: any) => {
            if (typeof item === 'string') {
              return { concept: item, description: "" };
            } else if (typeof item === 'object' && item !== null) {
              return {
                concept: item.concept || item.name || item.key || item.title || "Unnamed Concept",
                description: item.description || item.desc || item.explanation || ""
              };
            } else {
              return { concept: "Unknown Concept", description: "" };
            }
          });
        } else {
          console.error("key_concepts is not an array:", analysis.key_concepts);
        }
      } else {
        console.error("summary is not a string:", analysis.summary);
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.log("Problematic response:", analysisJson);
      return NextResponse.json({ error: "Failed to parse AI response: " + (error as Error).message }, { status: 500 })
    }
    
    if (!aiSummary || !keyConcepts) {
      console.error("Failed to extract valid summary or key concepts");
      return NextResponse.json({ error: "Failed to generate valid summary" }, { status: 500 })
    }

    console.log("Updating lesson with new summary and key concepts");
    
    // 6. Update the lesson with the AI-generated summary and key concepts
    try {
      const { data: updatedLesson, error: updateError } = await supabaseAdmin
        .from("lessons")
        .update({
          ai_summary: aiSummary,
          key_concepts: keyConcepts,
          raw: analysisJson, // Store the raw response
          updated_at: new Date().toISOString()
        })
        .eq("id", lessonId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating lesson:", updateError);
        return NextResponse.json({ error: "Failed to save lesson summary: " + updateError.message }, { status: 500 });
      }

      if (!updatedLesson) {
        console.error("No lesson returned after update");
        return NextResponse.json({ error: "Failed to retrieve updated lesson" }, { status: 500 });
      }
      
      console.log("Successfully updated lesson with summary");

      return NextResponse.json({
        success: true,
        lesson: updatedLesson
      });
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: "Database error: " + dbError.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Unhandled error in lesson summary generation:", error)
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
} 