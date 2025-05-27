import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, answer, questionIndex } = body

    if (!sessionId || answer === undefined || questionIndex === undefined) {
      return NextResponse.json({ error: "Session ID, answer, and question index are required" }, { status: 400 })
    }

    // Get session details including the lesson
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*, lessons(*)")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    // Parse the session summary to get questions
    let sessionData
    try {
      sessionData = JSON.parse(session.summary || '{}')
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 500 })
    }

    const questions = sessionData.questions || []
    if (questionIndex >= questions.length) {
      return NextResponse.json({ error: "Invalid question index" }, { status: 400 })
    }

    const currentQuestion = questions[questionIndex]
    const studentAnswer = answer.trim().toLowerCase()
    const correctAnswer = currentQuestion.answer.toLowerCase()

    // Check if answer is correct (allow for some flexibility)
    const isCorrect = checkAnswerCorrectness(studentAnswer, correctAnswer)
    
    // Save the student's answer
    const timestamp = new Date().toISOString()
    const { error: saveError } = await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "student",
      content: JSON.stringify({
        questionIndex,
        question: currentQuestion.question,
        studentAnswer: answer,
        correctAnswer: currentQuestion.answer,
        isCorrect,
        concept: currentQuestion.concept
      }),
      timestamp
    })

    if (saveError) {
      console.error("Error saving student answer:", saveError)
    }

    // Record understanding level based on correctness
    if (session.lessons?.key_concepts) {
      const level = isCorrect ? 4 : 2 // 4 = good understanding, 2 = needs work
      
      const { error: understandingError } = await supabaseAdmin
        .from("student_understanding")
        .upsert({
          student_id: session.student_id,
          lesson_id: session.lesson_id,
          concept: currentQuestion.concept,
          level,
          noted_at: timestamp,
        }, { onConflict: "student_id,lesson_id,concept" })

      if (understandingError) {
        console.error("Failed to record understanding:", understandingError)
      }
    }

    // Determine next question index
    const nextQuestionIndex = questionIndex + 1
    const isLastQuestion = nextQuestionIndex >= questions.length

    // Update session progress
    const { error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({ 
        summary: JSON.stringify({ 
          ...sessionData, 
          currentQuestionIndex: isLastQuestion ? questionIndex : nextQuestionIndex 
        })
      })
      .eq("id", sessionId)

    if (updateError) {
      console.error("Error updating session progress:", updateError)
    }

    // Generate response based on correctness
    let feedback = ""
    let showHint = false

    if (isCorrect) {
      feedback = generatePositiveFeedback()
    } else {
      feedback = generateIncorrectFeedback()
      showHint = true
    }

    return NextResponse.json({
      success: true,
      isCorrect,
      feedback,
      hint: showHint ? currentQuestion.hint : null,
      correctAnswer: isCorrect ? null : currentQuestion.answer,
      nextQuestionIndex: isLastQuestion ? null : nextQuestionIndex,
      isComplete: isLastQuestion,
      progress: {
        current: questionIndex + 1,
        total: questions.length,
        percentage: Math.round(((questionIndex + 1) / questions.length) * 100)
      }
    })
  } catch (error: any) {
    console.error("Error processing answer:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Check if student answer matches correct answer (with some flexibility)
function checkAnswerCorrectness(studentAnswer: string, correctAnswer: string): boolean {
  // Normalize both answers
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '')
  
  const normalizedStudent = normalize(studentAnswer)
  const normalizedCorrect = normalize(correctAnswer)
  
  // Exact match
  if (normalizedStudent === normalizedCorrect) {
    return true
  }
  
  // Check if student answer contains the key terms
  const correctWords = normalizedCorrect.split(/\s+/)
  const studentWords = normalizedStudent.split(/\s+/)
  
  // If correct answer is a single word, check if it's in student answer
  if (correctWords.length === 1) {
    return studentWords.includes(correctWords[0])
  }
  
  // For multi-word answers, check if most key words are present
  const matchingWords = correctWords.filter(word => 
    word.length > 2 && studentWords.some(sw => sw.includes(word) || word.includes(sw))
  )
  
  return matchingWords.length >= Math.ceil(correctWords.length * 0.7)
}

// Generate positive feedback for correct answers
function generatePositiveFeedback(): string {
  const feedbacks = [
    "Great job! That's exactly right!",
    "Perfect! You really understand this concept!",
    "Excellent work! You've got it!",
    "That's correct! Well done!",
    "Fantastic! You nailed it!",
    "Right on! You're doing great!",
    "Awesome! That's the perfect answer!"
  ]
  return feedbacks[Math.floor(Math.random() * feedbacks.length)]
}

// Generate feedback for incorrect answers
function generateIncorrectFeedback(): string {
  const feedbacks = [
    "Not quite right, but you're on the right track!",
    "Close! Let me give you a hint to help you out.",
    "That's not quite it, but don't worry - here's a hint!",
    "Almost there! Try thinking about it this way:",
    "Good try! Let me help you with a hint:",
    "Not exactly, but you're thinking in the right direction!"
  ]
  return feedbacks[Math.floor(Math.random() * feedbacks.length)]
}
