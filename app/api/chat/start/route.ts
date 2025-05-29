import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// In-memory lock to prevent race conditions
const sessionLocks = new Map<string, Promise<any>>()

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
  console.log(`[CHAT START] POST request received`)
  
  try {
    const body = await request.json()
    const { studentId, lessonId } = body

    console.log(`[CHAT START] Request for student ${studentId}, lesson ${lessonId}`)

    if (!studentId || !lessonId) {
      console.log(`[CHAT START] Missing required parameters`)
      return NextResponse.json({ error: "Student ID and Lesson ID are required" }, { status: 400 })
    }

    // Create a lock key for this student-lesson combination
    const actualLockKey = `${studentId}-${lessonId}`
    
    // If there's already a request in progress for this combination, wait for it
    if (sessionLocks.has(actualLockKey)) {
      console.log(`[CHAT START] Waiting for existing request to complete for ${actualLockKey}`)
      try {
        const existingResult = await sessionLocks.get(actualLockKey)
        console.log(`[CHAT START] Returning existing result`)
        return existingResult
      } catch (error) {
        console.error(`[CHAT START] Error waiting for existing request:`, error)
        // Continue with new request if waiting fails
      }
    }

    // Create a new lock for this request
    console.log(`[CHAT START] Creating new request promise`)
    const requestPromise = handleChatStartRequest(studentId, lessonId)
    sessionLocks.set(actualLockKey, requestPromise)

    try {
      console.log(`[CHAT START] Awaiting request handling`)
      const result = await requestPromise
      console.log(`[CHAT START] Request completed successfully`)
      return result
    } finally {
      // Clean up the lock
      sessionLocks.delete(actualLockKey)
      console.log(`[CHAT START] Cleaned up lock for ${actualLockKey}`)
    }

  } catch (error: any) {
    console.error("ERROR in chat/start POST:", error)
    console.error("Error stack:", error.stack)
    
    // Ensure we always return a proper JSON response
    try {
      return NextResponse.json({ 
        error: error.message || "Internal server error",
        details: error.stack || "No stack trace available"
      }, { status: 500 })
    } catch (responseError) {
      console.error("Error creating error response:", responseError)
      // Last resort - return a basic error
      return new Response(JSON.stringify({ error: "Critical server error" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

async function handleChatStartRequest(studentId: string, lessonId: string) {
  console.log(`[CHAT START] Handling request for student ${studentId}, lesson ${lessonId}`)
  
  try {
    // Check for existing session (active or completed) for this student and lesson
    console.log(`[CHAT START] Querying database for existing sessions`)
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .in("status", ["active", "completed"])
      .order("started_at", { ascending: false })
      .limit(1)

    if (sessionsError) {
      console.error(`[CHAT START] Database error fetching sessions:`, sessionsError)
      throw new Error(`Database error: ${sessionsError.message}`)
    }

    console.log(`[CHAT START] Session query result:`, { 
      found: sessions && sessions.length > 0, 
      sessionId: sessions?.[0]?.id,
      status: sessions?.[0]?.status,
      sessionCount: sessions?.length || 0
    })

    let sessionData = sessions && sessions.length > 0 ? sessions[0] : null

    // If we have a completed session, return it as completed
    if (sessionData && sessionData.status === "completed") {
      console.log(`[CHAT START] Found completed session ${sessionData.id}`)
      
      // Parse session state to get progress
      let sessionState: any = null
      if (sessionData.summary) {
        try {
          sessionState = JSON.parse(sessionData.summary)
          console.log(`[CHAT START] Parsed completed session state successfully`)
        } catch (e) {
          console.error(`[CHAT START] Failed to parse completed session state:`, e)
        }
      }

      const response = {
        success: true,
        sessionId: sessionData.id,
        currentQuestion: null,
        currentPhase: 'completed',
        progress: {
          current: sessionState?.questions?.length || 0,
          total: sessionState?.questions?.length || 0,
          percentage: 100
        },
        resumed: true,
        isCompleted: true
      }
      
      console.log(`[CHAT START] Returning completed session response`)
      return NextResponse.json(response)
    }

    // If no active session exists, create a new one
    if (!sessionData || sessionData.status !== "active") {
      console.log(`[CHAT START] Creating new session for student ${studentId}, lesson ${lessonId}`)
      
      try {
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
          throw new Error(`Failed to create session: ${sessionError.message}`)
        }

        console.log(`[CHAT START] New session created:`, newSession.id)
        sessionData = newSession
      } catch (dbError: any) {
        console.error(`[CHAT START] Database error creating session:`, dbError)
        throw new Error(`Database error: ${dbError.message}`)
      }
    }

    // Get lesson details and key concepts
    console.log(`[CHAT START] Fetching lesson details for lesson ${lessonId}`)
    let lesson: any
    try {
      const { data: lessonData, error: lessonError } = await supabaseAdmin
        .from("lessons")
        .select("topic, ai_summary, key_concepts")
        .eq("id", lessonId)
        .single()

      if (lessonError) {
        console.error("Error fetching lesson:", lessonError)
        throw new Error(`Failed to fetch lesson details: ${lessonError.message}`)
      }

      if (!lessonData) {
        console.error("Lesson not found")
        throw new Error("Lesson not found")
      }

      lesson = lessonData
      console.log(`[CHAT START] Lesson fetched:`, { 
        topic: lesson.topic, 
        hasKeyConcepts: !!(lesson.key_concepts && Array.isArray(lesson.key_concepts) && lesson.key_concepts.length > 0),
        conceptCount: lesson.key_concepts?.length || 0
      })

      // Check if lesson has key concepts
      if (!lesson.key_concepts || !Array.isArray(lesson.key_concepts) || lesson.key_concepts.length === 0) {
        console.log(`[CHAT START] Lesson has no key concepts`)
        return NextResponse.json({ 
          error: "Chat is not available for this lesson yet. The teacher needs to generate lesson content with key concepts first.",
          chatNotAvailable: true 
        }, { status: 400 })
      }
    } catch (lessonError: any) {
      console.error(`[CHAT START] Error in lesson fetching:`, lessonError)
      throw lessonError
    }

    // Parse existing session state or create new one
    let sessionState: any
    if (sessionData && sessionData.summary) {
      try {
        sessionState = JSON.parse(sessionData.summary)
        console.log(`[CHAT START] Parsed session state:`, {
          hasQuestions: !!(sessionState?.questions),
          questionCount: sessionState?.questions?.length || 0,
          currentIndex: sessionState?.currentQuestionIndex || 0,
          currentPhase: sessionState?.currentPhase
        })
      } catch (e) {
        console.log(`[CHAT START] Failed to parse session state:`, e)
        sessionState = null
      }
    } else {
      console.log(`[CHAT START] No existing session state found`)
    }

    // If resuming existing session with valid state
    if (sessionState && sessionState.questions && sessionState.questions.length > 0) {
      console.log(`[CHAT START] Resuming session ${sessionData.id} with ${sessionState.questions.length} questions`)
      
      const currentQuestion = sessionState.questions[sessionState.currentQuestionIndex || 0]
      const currentIndex = sessionState.currentQuestionIndex || 0
      
      // Calculate progress correctly
      // For resumed sessions, current should reflect which concept we're on
      const completedConcepts = sessionState.currentPhase === 'example' ? currentIndex : Math.max(0, currentIndex - 1)
      const progress = {
        current: currentIndex + 1,
        total: sessionState.questions.length,
        percentage: sessionState.questions.length > 0 
          ? Math.round((completedConcepts / sessionState.questions.length) * 100)
          : 0
      }

      return NextResponse.json({ 
        success: true,
        sessionId: sessionData.id,
        currentQuestion: currentQuestion,
        currentPhase: sessionState.currentPhase || 'multiple_choice',
        progress: progress,
        resumed: true
      })
    }

    // If we have an existing session but no valid session state, we need to regenerate questions
    // This can happen if the session was created but questions generation failed previously
    const isExistingSessionWithoutState = sessionData && (!sessionState || !sessionState.questions)
    
    console.log(`[CHAT START] Generating questions for session ${sessionData.id}`, {
      isExisting: !!sessionData,
      needsRegeneration: isExistingSessionWithoutState
    })

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

    // Save Chirpy's initial greeting as the first message (only if new session)
    const isNewSession = !sessions || sessions.length === 0 || sessionData.status !== "active"
    if (isNewSession) {
      console.log(`[CHAT START] Saving initial message for new session ${sessionData.id}`)
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
    } else {
      console.log(`[CHAT START] Skipping initial message save for existing session ${sessionData.id}`)
    }

    console.log(`[CHAT START] Returning new session response for ${sessionData.id}`, {
      hasQuestions: questions.length > 0,
      questionCount: questions.length,
      regenerated: isExistingSessionWithoutState
    })

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
      resumed: false,
      regenerated: isExistingSessionWithoutState // Indicate if we regenerated questions for existing session
    })
  } catch (error: any) {
    console.error("Error in handleChatStartRequest:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to start chat session",
      details: error.stack
    }, { status: 500 })
  }
}
