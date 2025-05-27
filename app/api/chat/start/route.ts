import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, lessonId } = body

    if (!studentId || !lessonId) {
      return NextResponse.json({ error: "Student ID and Lesson ID are required" }, { status: 400 })
    }

    // Create a new chat session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        student_id: studentId,
        lesson_id: lessonId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessionError) {
      console.error("Error creating chat session:", sessionError)
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    // Get lesson details and key concepts
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("topic, ai_summary, key_concepts")
      .eq("id", lessonId)
      .single()

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      return NextResponse.json({ error: "Failed to fetch lesson details" }, { status: 500 })
    }

    // Check if lesson has key concepts - chat is only available when concepts exist
    if (!lesson.key_concepts || !Array.isArray(lesson.key_concepts) || lesson.key_concepts.length === 0) {
      return NextResponse.json({ 
        error: "Chat is not available for this lesson yet. The teacher needs to generate lesson content with key concepts first.",
        chatNotAvailable: true 
      }, { status: 400 })
    }

    // Get materials for additional context
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("lesson_id", lessonId)

    if (materialsError) {
      console.error("Error fetching materials:", materialsError)
    }

    // Extract context from materials
    let materialContext = "";
    if (materials && materials.length > 0) {
      materialContext = materials
        .map(m => {
          let content = `TITLE: ${m.title}\n`
          if (m.ai_summary) {
            content += `SUMMARY: ${m.ai_summary}\n`
          }
          if (m.key_concepts && Array.isArray(m.key_concepts) && m.key_concepts.length > 0) {
            content += `KEY CONCEPTS: ${m.key_concepts.map((c: { concept: string, description: string }) => 
              `${c.concept}: ${c.description || ""}`
            ).join("\n")}\n`
          }
          return content
        })
        .join("\n\n")
    }

    // Generate fill-in-the-blank questions for all concepts
    const { text: questionsJson } = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `You are an educational assistant creating conversational fill-in-the-blank questions for students.

LESSON TOPIC: ${lesson.topic}
LESSON SUMMARY: ${lesson.ai_summary || "No summary available"}

KEY CONCEPTS TO COVER:
${lesson.key_concepts.map((kc: any, index: number) => {
  const conceptName = typeof kc === "string" ? kc : kc.concept;
  const conceptDesc = typeof kc === "string" ? "" : kc.description || "";
  return `${index + 1}. ${conceptName}${conceptDesc ? `: ${conceptDesc}` : ""}`;
}).join("\n")}

ADDITIONAL CONTEXT:
${materialContext}

Create conversational questions where Chirpy (a curious bird) asks the student about concepts, and the student responds with explanations. Format this as a natural conversation:

IMPORTANT RULES:
1. Chirpy should ask "What is [concept]?" or "Can you explain [concept]?"
2. The student's response should be INCOMPLETE with a _____ blank to fill
3. The answer should be 4-12 words that fill in the blank
4. Make it feel like a real conversation between friends
5. The student response MUST be incomplete and end with _____ or have _____ in the middle

EXAMPLE:
- Concept: "Photosynthesis"
- Chirpy question: "What is photosynthesis?"
- Student response: "It's the process where _____" (INCOMPLETE - needs filling)
- Student answer: "plants use sunlight and water to make food" (fills the blank)

ANOTHER EXAMPLE:
- Concept: "Gravity"
- Chirpy question: "What is gravity?"
- Student response: "It's the force that _____" (INCOMPLETE - needs filling)
- Student answer: "pulls objects toward the center of Earth"

DO NOT create complete sentences like "In addition, the order of numbers does not affect the result"
DO create incomplete sentences like "It's when _____ doesn't change the result"

Return a JSON object with this structure:
{
  "questions": [
    {
      "concept": "concept name",
      "chirpyQuestion": "What is [concept]? I'm really curious about this!",
      "studentResponse": "It's the rule that _____",
      "answer": "lets you change the order when adding numbers",
      "hint": "a helpful hint if the student struggles"
    }
  ]
}

CRITICAL: The studentResponse MUST be incomplete and contain exactly one _____ blank.
The answer fills in that blank to complete the sentence.
Make the conversation natural and friendly.
Only return the JSON object, nothing else.`
    })

    // Parse the AI response
    let questions = []
    try {
      // Clean the response to extract JSON
      let jsonStr = questionsJson.trim()
      const startIdx = jsonStr.indexOf('{')
      const endIdx = jsonStr.lastIndexOf('}')
      
      if (startIdx >= 0 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1)
      }
      
      const parsed = JSON.parse(jsonStr)
      questions = parsed.questions || []
    } catch (parseError) {
      console.error("Failed to parse questions JSON:", parseError)
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
    }

    // Save the session data with questions
    const { error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({ 
        summary: JSON.stringify({ questions, currentQuestionIndex: 0 })
      })
      .eq("id", sessionData.id)

    if (updateError) {
      console.error("Error updating session with questions:", updateError)
    }

    return NextResponse.json({ 
      success: true,
      session: sessionData.id,
      questions: questions,
      currentQuestionIndex: 0,
      totalQuestions: questions.length
    })
  } catch (error: any) {
    console.error("Error starting chat session:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
