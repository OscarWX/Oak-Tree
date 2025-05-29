import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface ConceptQuestion {
  concept: string
  conceptDescription: string
  multipleChoiceQuestion: string
  options: {
    a: string
    b: string
    c: string
  }
  correctOption: 'a' | 'b' | 'c'
  correctExplanation: string
  examplePrompt: string
  exampleHint: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, lessonId } = body

    if (!studentId || !lessonId) {
      return NextResponse.json({ error: "Student ID and Lesson ID are required" }, { status: 400 })
    }

    // Check for existing active session for this student and lesson
    const { data: existingSession, error: existingError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .eq("status", "active")
      .single()

    let sessionData = existingSession

    // If no existing session, create a new one
    if (!existingSession || existingError) {
      const { data: newSession, error: sessionError } = await supabaseAdmin
        .from("chat_sessions")
        .insert({
          student_id: studentId,
          lesson_id: lessonId,
          started_at: new Date().toISOString(),
          status: "active"
        })
        .select()
        .single()

      if (sessionError) {
        console.error("Error creating chat session:", sessionError)
        return NextResponse.json({ error: sessionError.message }, { status: 500 })
      }

      sessionData = newSession
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

    // Check if lesson has key concepts
    if (!lesson.key_concepts || !Array.isArray(lesson.key_concepts) || lesson.key_concepts.length === 0) {
      return NextResponse.json({ 
        error: "Chat is not available for this lesson yet. The teacher needs to generate lesson content with key concepts first.",
        chatNotAvailable: true 
      }, { status: 400 })
    }

    // Parse existing session state or create new one
    let sessionState: any
    if (existingSession && existingSession.summary) {
      try {
        sessionState = JSON.parse(existingSession.summary)
      } catch {
        sessionState = null
      }
    }

    // If resuming existing session with valid state
    if (sessionState && sessionState.questions && sessionState.questions.length > 0) {
      const currentQuestion = sessionState.questions[sessionState.currentQuestionIndex]
      const progress = {
        current: sessionState.currentQuestionIndex + 1,
        total: sessionState.questions.length,
        percentage: Math.round((sessionState.currentQuestionIndex / sessionState.questions.length) * 100)
      }

      return NextResponse.json({ 
        success: true,
        sessionId: sessionData.id,
        currentQuestion: currentQuestion,
        currentPhase: sessionState.currentPhase,
        progress: progress,
        resumed: true
      })
    }

    // Generate new questions for new session
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("lesson_id", lessonId)

    if (materialsError) {
      console.error("Error fetching materials:", materialsError)
    }

    // Extract context from materials
    let materialContext = ""
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

    // Generate standardized questions for each concept
    const { text: questionsJson } = await generateText({
      model: openai("gpt-4"),
      prompt: `You are Chirpy, an enthusiastic and friendly educational assistant creating a standardized learning session. For each concept, create a multiple-choice question followed by an example request.

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

For each concept, create a standardized interaction following this EXACT pattern:

1. Multiple Choice Question:
   - Start with: "Hi! I heard in your class you learned about [Concept Name]. Can you tell me what it is?"
   - Provide 3 options (a, b, c) where one is correct and two are plausible but incorrect
   - Make options concise but clear

2. Example Request:
   - After the correct answer, transition naturally without saying "Yes! That's right!"
   - Use a smooth transition like: "Oh, I know! That reminds me... [short real-world example]. That's an example of [concept], right? But I need another one. Can you think of one?"
   - Provide a hint that helps students think of examples

IMPORTANT:
- Keep Chirpy's personality enthusiastic and encouraging
- Make incorrect options believable but clearly distinguishable from the correct answer
- Examples should be relatable to students
- Keep language simple and conversational
- For correctExplanation, DON'T say "Yes! That's right!" - instead use natural transitions like:
  * "Exactly!"
  * "That's it!"
  * "Perfect!"
  * "You got it!"
  * "Spot on!"
  * Or just move directly to the example without explicit confirmation

Return a JSON object with this structure:
{
  "questions": [
    {
      "concept": "concept name",
      "conceptDescription": "brief description if available",
      "multipleChoiceQuestion": "Hi! I heard in your class you learned about [concept]. Can you tell me what it is?",
      "options": {
        "a": "option a text",
        "b": "option b text",
        "c": "option c text"
      },
      "correctOption": "a|b|c",
      "correctExplanation": "Natural transition or brief acknowledgment (NOT 'Yes! That's right!')",
      "examplePrompt": "Oh, I know! That reminds me... [example]. That's an example of [concept], right? But I need another one. Can you think of one?",
      "exampleHint": "Think of another real-life example that shows [concept]"
    }
  ]
}

Only return the JSON object, nothing else.`
    })

    // Parse the AI response
    let questions: ConceptQuestion[] = []
    try {
      const parsed = JSON.parse(questionsJson.trim())
      questions = parsed.questions || []
    } catch (parseError) {
      console.error("Failed to parse questions JSON:", parseError)
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
    }

    // Save the session data with questions
    sessionState = {
      questions,
      currentQuestionIndex: 0,
      currentPhase: 'multiple_choice' as 'multiple_choice' | 'example',
      conversationHistory: []
    }

    const { error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({ 
        summary: JSON.stringify(sessionState)
      })
      .eq("id", sessionData.id)

    if (updateError) {
      console.error("Error updating session with questions:", updateError)
    }

    // Save Chirpy's initial greeting as the first message (only if not resuming)
    if (!existingSession) {
      const firstQuestion = questions[0]
      if (firstQuestion) {
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionData.id,
          sender_type: "ai",
          content: JSON.stringify({
            type: 'multiple_choice',
            message: firstQuestion.multipleChoiceQuestion,
            options: firstQuestion.options,
            concept: firstQuestion.concept,
            questionIndex: 0
          }),
          timestamp: new Date().toISOString()
        })
      }
    }

    return NextResponse.json({ 
      success: true,
      sessionId: sessionData.id,
      currentQuestion: questions[0],
      currentPhase: 'multiple_choice',
      progress: {
        current: 1,
        total: questions.length,
        percentage: 0
      },
      resumed: false
    })
  } catch (error: any) {
    console.error("Error starting chat session:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
