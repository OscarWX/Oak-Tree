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
        // Wrong answer - track attempt and provide dynamic feedback
        
        // Track the multiple choice attempt
        const attemptNumber = await trackMultipleChoiceAttempt(
          sessionId,
          session.student_id,
          session.lesson_id,
          currentQuestion.concept,
          selectedOption,
          currentQuestion.correctOption,
          false
        )

        let feedback: string
        let hint: string

        if (attemptNumber === 1) {
          // First wrong attempt - provide personalized hint based on their specific choice
          const dynamicHint = await generateMultipleChoiceDynamicHint(
            selectedOption,
            currentQuestion,
            session.lessons?.topic || ''
          )
          
          feedback = "Not quite! Let me help you think about this."
          hint = cleanHintText(dynamicHint)
          
          // Store the dynamic hint for multiple choice
          await storeDynamicHintEnhanced(
            sessionId,
            session.student_id,
            session.lesson_id,
            currentQuestion.concept,
            `Option ${selectedOption.toUpperCase()}: ${currentQuestion.options[selectedOption as keyof typeof currentQuestion.options]}`,
            hint,
            `The correct answer is option ${currentQuestion.correctOption.toUpperCase()}`,
            'multiple_choice',
            attemptNumber
          )
        } else {
          // Second or later wrong attempt - give the correct answer directly
          feedback = "Let me help you with the correct answer."
          hint = `The correct answer is option ${currentQuestion.correctOption.toUpperCase()}: ${currentQuestion.options[currentQuestion.correctOption]}. ${currentQuestion.correctExplanation}`
        }
        
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
          hint,
          tryAgain: attemptNumber === 1 // Only allow retry on first attempt
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
        
        // Generate dynamic hint based on student's specific answer
        const dynamicHint = await generateDynamicHint(
          answer, 
          currentQuestion.concept, 
          session.lessons?.topic || '', 
          currentQuestion.exampleHint
        )
        
        // Ensure we have a clean hint (no JSON formatting, no extra text)
        const cleanHint = cleanHintText(dynamicHint)
        
        // Store the dynamic hint in database
        await storeDynamicHintEnhanced(
          sessionId,
          session.student_id,
          session.lesson_id,
          currentQuestion.concept,
          answer,
          cleanHint,
          currentQuestion.exampleHint,
          'example',
          1
        )
        
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
          hint: cleanHint,
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
      model: openai("gpt-4"),
      prompt: `You are an educational assessment AI. Determine if the student's example demonstrates understanding of the concept.

TOPIC: ${topic}
CONCEPT: ${concept}
STUDENT'S EXAMPLE: ${example}

Evaluation criteria:
1. The example should be relevant to the concept and show understanding
2. Accept creative, real-world, personal, or hypothetical examples
3. The example doesn't need to be perfect - basic understanding is sufficient
4. Be GENEROUS in accepting examples that show any connection to the concept
5. For business/economics concepts, accept practical scenarios even if simplified
6. For mathematical concepts, the math should be correct
7. Look for the ESSENCE of the concept, not perfect academic definitions

Examples for "Interrelatedness of Markets":
- VALID: "When one bank went bankrupt, it affected other banks" (shows connection/ripple effect)
- VALID: "When gas prices go up, food prices also increase" (shows market connections)
- VALID: "Stock market crash affects housing market" (shows interconnection)
- INVALID: "I like apples" (no connection to market relationships)
- INVALID: Random text or very short responses

Examples for "Supply and Demand":
- VALID: "When concert tickets are limited, prices go up"
- VALID: "More people wanted the new phone, so it cost more"
- INVALID: "Economics is hard" (no demonstration of concept)

Be GENEROUS and FLEXIBLE. If the student shows ANY understanding of how the concept works in practice, accept it as VALID.

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

// Helper function to clean hint text from any JSON artifacts
function cleanHintText(hintText: string): string {
  if (!hintText) return ""
  
  // Remove any JSON formatting that might have slipped through
  let cleaned = hintText.trim()
  
  // Remove JSON object wrapper if present
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned)
      cleaned = parsed.hint || cleaned
    } catch (e) {
      // If parsing fails, try to extract hint manually
      const hintMatch = cleaned.match(/"hint":\s*"([^"]+)"/i)
      if (hintMatch) {
        cleaned = hintMatch[1]
      }
    }
  }
  
  // Remove any remaining quotes at start/end
  cleaned = cleaned.replace(/^["']|["']$/g, '')
  
  // Unescape any escaped quotes
  cleaned = cleaned.replace(/\\"/g, '"')
  
  return cleaned.trim()
}

// Generate dynamic hint based on student's specific answer
async function generateDynamicHint(studentAnswer: string, concept: string, topic: string, originalHint: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt: `You are an educational AI helping a student who gave an incorrect example. Generate a specific, helpful hint based on their answer.

TOPIC: ${topic}
CONCEPT: ${concept}
STUDENT'S ANSWER: ${studentAnswer}
ORIGINAL HINT: ${originalHint}

Guidelines:
1. Be encouraging and specific to their answer
2. Point out what they got right (if anything)
3. Gently guide them toward a better example
4. Keep it concise (1-2 sentences)
5. Use their answer as a starting point for improvement
6. Be supportive, not critical

IMPORTANT: Respond with ONLY a JSON object in this exact format:
{
  "hint": "Your helpful hint here"
}

Examples:
- If student said "I like pizza" for "Supply and Demand":
{
  "hint": "I can see you're thinking about things you enjoy! Try thinking about what happens to pizza prices when lots of people want it but there aren't many pizzas available."
}

- If student said "Banks are important" for "Interrelatedness of Markets":
{
  "hint": "You're right that banks are important! Now think about what happens to other businesses or markets when a major bank has problems."
}

- If student said "I don't know" or gave a very vague answer:
{
  "hint": "That's okay! Let me help you think about this. ${originalHint.replace(/"/g, '\\"')}"
}

Generate ONLY the JSON object with the hint:`
    })

    // Parse the JSON response to extract just the hint
    try {
      const response = JSON.parse(text.trim())
      return response.hint || originalHint
    } catch (parseError) {
      console.error("Failed to parse dynamic hint JSON:", parseError)
      // If JSON parsing fails, try to extract hint from text
      const hintMatch = text.match(/"hint":\s*"([^"]+)"/i)
      if (hintMatch) {
        return hintMatch[1]
      }
      // If all else fails, return original hint
      return originalHint
    }
  } catch (error) {
    console.error("Failed to generate dynamic hint:", error)
    return originalHint // Fallback to original hint
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

// Store dynamic hint in database
async function storeDynamicHint(
  sessionId: string, 
  studentId: string, 
  lessonId: string, 
  concept: string, 
  studentAnswer: string, 
  dynamicHint: string, 
  originalHint: string
): Promise<void> {
  try {
    await supabaseAdmin.rpc('store_dynamic_hint', {
      p_session_id: sessionId,
      p_student_id: studentId,
      p_lesson_id: lessonId,
      p_concept: concept,
      p_student_answer: studentAnswer,
      p_dynamic_hint: dynamicHint,
      p_original_hint: originalHint
    })
  } catch (error) {
    console.error("Failed to store dynamic hint:", error)
    // Don't throw error - this is not critical for the main flow
  }
}

// Track multiple choice attempt
async function trackMultipleChoiceAttempt(
  sessionId: string,
  studentId: string,
  lessonId: string,
  concept: string,
  selectedOption: string,
  correctOption: string,
  isCorrect: boolean
): Promise<number> {
  try {
    const { data: attempts, error: attemptError } = await supabaseAdmin
      .from("multiple_choice_attempts")
      .select("*")
      .eq("session_id", sessionId)
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .eq("concept", concept)
      .eq("selected_option", selectedOption)
      .eq("correct_option", correctOption)
      .eq("is_correct", isCorrect)

    if (attemptError || !attempts || attempts.length === 0) {
      // If no record exists for this attempt, create a new one
      await supabaseAdmin.from("multiple_choice_attempts").insert({
        session_id: sessionId,
        student_id: studentId,
        lesson_id: lessonId,
        concept,
        selected_option: selectedOption,
        correct_option: correctOption,
        is_correct: isCorrect
      })
      return 1
    } else {
      // If record exists, return the attempt number
      return attempts.length
    }
  } catch (error) {
    console.error("Failed to track multiple choice attempt:", error)
    return 1 // Default to first attempt
  }
}

// Generate dynamic hint for multiple choice answers
async function generateMultipleChoiceDynamicHint(
  selectedOption: string,
  question: any,
  topic: string
): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt: `You are an educational AI helping a student who gave an incorrect multiple choice answer. Generate a specific, helpful hint based on their answer.

TOPIC: ${topic}
CONCEPT: ${question.concept}
STUDENT'S ANSWER: ${selectedOption}

Guidelines:
1. Be encouraging and specific to their answer
2. Point out what they got right (if anything)
3. Gently guide them toward a better answer
4. Keep it concise (1-2 sentences)
5. Use their answer as a starting point for improvement
6. Be supportive, not critical

IMPORTANT: Respond with ONLY a JSON object in this exact format:
{
  "hint": "Your helpful hint here"
}

Examples:
- If student said "I like pizza" for "Supply and Demand":
{
  "hint": "I can see you're thinking about things you enjoy! Try thinking about what happens to pizza prices when lots of people want it but there aren't many pizzas available."
}

- If student said "Banks are important" for "Interrelatedness of Markets":
{
  "hint": "You're right that banks are important! Now think about what happens to other businesses or markets when a major bank has problems."
}

- If student said "I don't know" or gave a very vague answer:
{
  "hint": "That's okay! Let me help you think about this. ${question.correctExplanation.replace(/"/g, '\\"')}"
}

Generate ONLY the JSON object with the hint:`
    })

    // Parse the JSON response to extract just the hint
    try {
      const response = JSON.parse(text.trim())
      return response.hint || question.correctExplanation
    } catch (parseError) {
      console.error("Failed to parse dynamic hint JSON:", parseError)
      // If JSON parsing fails, try to extract hint from text
      const hintMatch = text.match(/"hint":\s*"([^"]+)"/i)
      if (hintMatch) {
        return hintMatch[1]
      }
      // If all else fails, return correct explanation
      return question.correctExplanation
    }
  } catch (error) {
    console.error("Failed to generate dynamic hint:", error)
    return question.correctExplanation // Fallback to correct explanation
  }
}

// Store dynamic hint in database enhanced
async function storeDynamicHintEnhanced(
  sessionId: string, 
  studentId: string, 
  lessonId: string, 
  concept: string, 
  studentAnswer: string, 
  dynamicHint: string, 
  originalHint: string,
  answerType: string,
  attemptNumber: number
): Promise<void> {
  try {
    await supabaseAdmin.rpc('store_dynamic_hint_enhanced', {
      p_session_id: sessionId,
      p_student_id: studentId,
      p_lesson_id: lessonId,
      p_concept: concept,
      p_student_answer: studentAnswer,
      p_dynamic_hint: dynamicHint,
      p_original_hint: originalHint,
      p_answer_type: answerType,
      p_attempt_number: attemptNumber
    })
  } catch (error) {
    console.error("Failed to store dynamic hint enhanced:", error)
    // Don't throw error - this is not critical for the main flow
  }
}
