import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface SessionState {
  questions: any[]
  currentQuestionIndex: number
  currentPhase: 'multiple_choice' | 'example'
  conversationHistory: any[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, answer, answerType } = body

    if (!sessionId || !answer || !answerType) {
      return NextResponse.json({ error: "Session ID, answer, and answer type are required" }, { status: 400 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*, lessons(*)")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    // Parse session state
    let sessionState: SessionState
    try {
      sessionState = JSON.parse(session.summary || '{}')
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 500 })
    }

    const { questions, currentQuestionIndex, currentPhase } = sessionState
    const currentQuestion = questions[currentQuestionIndex]

    if (!currentQuestion) {
      return NextResponse.json({ error: "No current question found" }, { status: 400 })
    }

    let response: any = {}
    const timestamp = new Date().toISOString()

    if (answerType === 'multiple_choice' && currentPhase === 'multiple_choice') {
      // Handle multiple choice answer
      const selectedOption = answer.toLowerCase()
      const isCorrect = selectedOption === currentQuestion.correctOption

      // Save student's answer
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        sender_type: "student",
        content: JSON.stringify({
          type: 'multiple_choice_answer',
          selectedOption: selectedOption,
          isCorrect,
          concept: currentQuestion.concept,
          questionIndex: currentQuestionIndex
        }),
        timestamp
      })

      if (isCorrect) {
        // Save Sage's positive response
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          sender_type: "sage",
          content: JSON.stringify({
            type: 'feedback',
            message: currentQuestion.correctExplanation,
            isPositive: true
          }),
          timestamp: new Date(Date.now() + 1000).toISOString()
        })

        // Move to example phase
        sessionState.currentPhase = 'example'
        
        // Save Chirpy's example prompt
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          sender_type: "ai",
          content: JSON.stringify({
            type: 'example_request',
            message: currentQuestion.examplePrompt,
            hint: currentQuestion.exampleHint,
            concept: currentQuestion.concept
          }),
          timestamp: new Date(Date.now() + 2000).toISOString()
        })

        response = {
          success: true,
          isCorrect: true,
          feedback: currentQuestion.correctExplanation,
          nextPhase: 'example',
          examplePrompt: currentQuestion.examplePrompt,
          hint: currentQuestion.exampleHint
        }

        // Record good understanding
        await recordUnderstanding(session.student_id, session.lesson_id, currentQuestion.concept, 4)
        
        // Update concept progress
        await updateConceptProgress(sessionId, currentQuestion.concept, 'example')

      } else {
        // Wrong answer - Sage provides gentle correction
        const feedback = getIncorrectFeedback(selectedOption, currentQuestion)
        
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          sender_type: "sage",
          content: JSON.stringify({
            type: 'feedback',
            message: feedback,
            isPositive: false,
            showHint: true
          }),
          timestamp: new Date(Date.now() + 1000).toISOString()
        })

        response = {
          success: true,
          isCorrect: false,
          feedback,
          hint: `The correct answer is option ${currentQuestion.correctOption.toUpperCase()}: ${currentQuestion.options[currentQuestion.correctOption]}`,
          tryAgain: true
        }

        // Record needs improvement
        await recordUnderstanding(session.student_id, session.lesson_id, currentQuestion.concept, 2)
        
        // Track multiple choice attempt
        await updateConceptProgress(sessionId, currentQuestion.concept, 'multiple_choice')
      }

    } else if (answerType === 'example' && currentPhase === 'example') {
      // Handle example submission
      const isValidExample = await validateExample(answer, currentQuestion.concept, session.lessons?.topic)

      // Save student's example
      await supabaseAdmin.from("chat_messages").insert({
        session_id: sessionId,
        sender_type: "student",
        content: JSON.stringify({
          type: 'example_submission',
          example: answer,
          concept: currentQuestion.concept,
          isValid: isValidExample
        }),
        timestamp
      })

      if (isValidExample) {
        // Positive feedback for good example
        const feedback = generateExampleFeedback(true, answer, currentQuestion.concept, session.lessons?.topic)
        
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          sender_type: "ai",
          content: JSON.stringify({
            type: 'feedback',
            message: feedback,
            isPositive: true
          }),
          timestamp: new Date(Date.now() + 1000).toISOString()
        })

        // Move to next concept
        const nextIndex = currentQuestionIndex + 1
        const isComplete = nextIndex >= questions.length

        if (!isComplete) {
          sessionState.currentQuestionIndex = nextIndex
          sessionState.currentPhase = 'multiple_choice'
          
          const nextQuestion = questions[nextIndex]
          
          // Save next question
          await supabaseAdmin.from("chat_messages").insert({
            session_id: sessionId,
            sender_type: "ai",
            content: JSON.stringify({
              type: 'multiple_choice',
              message: nextQuestion.multipleChoiceQuestion,
              options: nextQuestion.options,
              concept: nextQuestion.concept,
              questionIndex: nextIndex
            }),
            timestamp: new Date(Date.now() + 2000).toISOString()
          })

          response = {
            success: true,
            isCorrect: true,
            feedback,
            nextQuestion: nextQuestion,
            nextPhase: 'multiple_choice',
            progress: {
              current: nextIndex + 1,
              total: questions.length,
              percentage: Math.round(((nextIndex + 1) / questions.length) * 100)
            }
          }
        } else {
          // Session complete
          await supabaseAdmin
            .from("chat_sessions")
            .update({ 
              ended_at: timestamp,
              understanding_level: 4
            })
            .eq("id", sessionId)

          response = {
            success: true,
            isCorrect: true,
            feedback,
            isComplete: true,
            progress: {
              current: questions.length,
              total: questions.length,
              percentage: 100
            }
          }
        }

        // Record excellent understanding for providing example
        await recordUnderstanding(session.student_id, session.lesson_id, currentQuestion.concept, 5)
        
        // Mark concept as completed
        await updateConceptProgress(sessionId, currentQuestion.concept, 'completed')

      } else {
        // Invalid example - provide helpful feedback
        const feedback = generateExampleFeedback(false, answer, currentQuestion.concept, session.lessons?.topic)
        
        await supabaseAdmin.from("chat_messages").insert({
          session_id: sessionId,
          sender_type: "ai",
          content: JSON.stringify({
            type: 'feedback',
            message: feedback,
            isPositive: false,
            showHint: true
          }),
          timestamp: new Date(Date.now() + 1000).toISOString()
        })

        response = {
          success: true,
          isCorrect: false,
          feedback,
          hint: currentQuestion.exampleHint,
          tryAgain: true
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid answer type or phase mismatch" }, { status: 400 })
    }

    // Update session state
    await supabaseAdmin
      .from("chat_sessions")
      .update({ 
        summary: JSON.stringify(sessionState)
      })
      .eq("id", sessionId)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error("Error processing message:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Validate if the provided example is relevant to the concept
async function validateExample(example: string, concept: string, topic: string): Promise<boolean> {
  try {
    if (!example || example.trim().length < 5) {
      return false
    }

    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `You are an educational assessment AI. Determine if the student's example demonstrates understanding of the concept.

TOPIC: ${topic}
CONCEPT: ${concept}
STUDENT'S EXAMPLE: ${example}

Evaluation criteria:
1. The example should be relevant to the concept
2. It should demonstrate understanding, not just repeat the definition
3. It can be creative or unconventional as long as it's valid
4. Accept examples from any context (personal, fictional, scientific, etc.)
5. The example doesn't need to be perfect, just show basic understanding
6. For mathematical concepts, the example must be mathematically correct
7. For properties or rules, the example must actually demonstrate that property/rule

Examples of VALID responses:
- Personal experiences that relate to the concept
- Hypothetical scenarios that illustrate the concept
- Real-world applications
- Creative analogies
- Mathematically correct examples that demonstrate the concept

Examples of INVALID responses:
- Random text or numbers
- Completely unrelated topics
- Just restating the concept name
- Nonsense or very short responses (less than 5 characters)
- Mathematically incorrect statements
- Examples that don't actually demonstrate the concept
- Simple equations that are wrong (like "1+22222=22")

For the Associative Property of Addition specifically:
- VALID: "(2+3)+4 = 2+(3+4)" or "When I collect 5 marbles, then 3 more, then 2 more, it's the same as collecting 5, then collecting 3+2 together"
- INVALID: "1+22222=22" (incorrect math), "2+2=4" (doesn't show associative property), random numbers

Be STRICT with mathematical concepts. The example must be both mathematically correct AND demonstrate the specific concept.

Respond with only "VALID" or "INVALID" - nothing else.`
    })

    return text.trim().toUpperCase() === "VALID"
  } catch (error) {
    console.error("Example validation failed:", error)
    return false
  }
}

// Record student understanding level
async function recordUnderstanding(studentId: string, lessonId: string, concept: string, level: number) {
  try {
    await supabaseAdmin
      .from("student_understanding")
      .upsert({
        student_id: studentId,
        lesson_id: lessonId,
        concept,
        level,
        noted_at: new Date().toISOString(),
      }, { onConflict: "student_id,lesson_id,concept" })
  } catch (error) {
    console.error("Failed to record understanding:", error)
  }
}

// Update concept progress tracking
async function updateConceptProgress(sessionId: string, concept: string, phase: 'multiple_choice' | 'example' | 'completed') {
  try {
    const completedAt = phase === 'completed' ? new Date().toISOString() : null
    
    await supabaseAdmin
      .from("concept_progress")
      .upsert({
        session_id: sessionId,
        concept,
        phase,
        completed_at: completedAt,
        attempts: 1 // This will be incremented if the record already exists
      }, { 
        onConflict: "session_id,concept",
        ignoreDuplicates: false 
      })
  } catch (error) {
    console.error("Failed to update concept progress:", error)
  }
}

// Generate feedback for incorrect multiple choice answers
function getIncorrectFeedback(selectedOption: string, question: any): string {
  const feedbacks = [
    "Not quite! Let me help you think about this differently.",
    "That's a common misconception! Here's a hint to guide you.",
    "Good try! But that's not quite right. Let's think about it together.",
    "I can see why you might think that, but there's a better answer.",
    "Almost there! Consider this hint and try again."
  ]
  return feedbacks[Math.floor(Math.random() * feedbacks.length)]
}

// Generate feedback for example submissions
function generateExampleFeedback(isValid: boolean, example?: string, concept?: string, topic?: string): string {
  if (isValid) {
    const positiveFeedbacks = [
      "Excellent example! You really understand this concept!",
      "That's a perfect example! Great job applying what you learned!",
      "Wow, what a creative example! You've got it!",
      "Fantastic! That shows you really grasp this concept!",
      "Great thinking! That's exactly the kind of example I was looking for!"
    ]
    return positiveFeedbacks[Math.floor(Math.random() * positiveFeedbacks.length)]
  } else {
    // Check if it's a mathematical error
    if (example && /\d+[\+\-\*\/]\d+\s*=\s*\d+/.test(example)) {
      // It looks like a math equation
      const parts = example.match(/(\d+)\s*[\+\-\*\/]\s*(\d+)\s*=\s*(\d+)/)
      if (parts) {
        const [, num1, num2, result] = parts
        const operator = example.match(/[\+\-\*\/]/)?.[0]
        let correctResult = 0
        
        switch(operator) {
          case '+': correctResult = parseInt(num1) + parseInt(num2); break
          case '-': correctResult = parseInt(num1) - parseInt(num2); break
          case '*': correctResult = parseInt(num1) * parseInt(num2); break
          case '/': correctResult = parseInt(num1) / parseInt(num2); break
        }
        
        if (parseInt(result) !== correctResult) {
          if (concept?.toLowerCase().includes('associative')) {
            return `Hmm, that math doesn't look right. ${num1} ${operator} ${num2} equals ${correctResult}, not ${result}. Also, remember to show how the associative property works by grouping numbers differently!`
          } else {
            return `Hmm, that calculation doesn't look right. ${num1} ${operator} ${num2} equals ${correctResult}, not ${result}. Try again with the correct calculation!`
          }
        }
      }
    }
    
    // Check if it's too simple for associative property
    if (concept?.toLowerCase().includes('associative') && example && /^\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+$/.test(example.trim())) {
      return "That's a correct equation, but it doesn't show the associative property. Try showing how grouping numbers differently gives the same result, like (2+3)+4 = 2+(3+4)."
    }
    
    // Generate context-appropriate feedback based on topic
    const isMathTopic = topic?.toLowerCase().includes('math') || 
                       topic?.toLowerCase().includes('algebra') || 
                       topic?.toLowerCase().includes('arithmetic') ||
                       topic?.toLowerCase().includes('geometry') ||
                       concept?.toLowerCase().includes('property') ||
                       concept?.toLowerCase().includes('equation')

    const helpfulFeedbacks = isMathTopic ? [
      "That's not quite what I was looking for. Try thinking of a more specific example that clearly shows the concept.",
      "Good effort! But let's think of an example that better demonstrates this concept.",
      "I see what you're thinking, but can you give me a clearer example? Remember to check your math!",
      "Not quite there yet. Remember, your example should clearly demonstrate the concept we're learning.",
      "Let's try again! Think about how this concept appears in everyday life, and make sure any math is correct."
    ] : [
      "That's not quite what I was looking for. Try thinking of a more specific example that clearly shows the concept.",
      "Good effort! But let's think of an example that better demonstrates this concept.",
      "I see what you're thinking, but can you give me a clearer example?",
      "Not quite there yet. Remember, your example should clearly demonstrate the concept we're learning.",
      "Let's try again! Think about how this concept appears in everyday life or in the subject we're studying."
    ]
    return helpfulFeedbacks[Math.floor(Math.random() * helpfulFeedbacks.length)]
  }
}
