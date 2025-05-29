import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, lessonId } = body

    if (!studentId || !lessonId) {
      return NextResponse.json({ error: "Student ID and Lesson ID are required" }, { status: 400 })
    }

    // Find the most recent session (active or completed)
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .in("status", ["active", "completed"])
      .order("started_at", { ascending: false })
      .limit(1)

    if (sessionError) {
      console.error("Error fetching sessions:", sessionError)
      return NextResponse.json({ 
        error: `Database error: ${sessionError.message}` 
      }, { status: 500 })
    }

    const activeSession = sessions && sessions.length > 0 ? sessions[0] : null

    if (!activeSession) {
      return NextResponse.json({ 
        error: "No session found to reset" 
      }, { status: 404 })
    }

    // Parse the session state to preserve questions
    let sessionState: any
    try {
      sessionState = JSON.parse(activeSession.summary || '{}')
    } catch (e) {
      return NextResponse.json({ 
        error: "Invalid session data" 
      }, { status: 500 })
    }

    // Check if we have questions to preserve
    if (!sessionState.questions || sessionState.questions.length === 0) {
      return NextResponse.json({ 
        error: "No questions found in session to reset" 
      }, { status: 400 })
    }

    // Delete all messages for this session
    const { error: deleteMessagesError } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("session_id", activeSession.id)

    if (deleteMessagesError) {
      console.error("Error deleting messages:", deleteMessagesError)
      return NextResponse.json({ 
        error: "Failed to clear conversation messages" 
      }, { status: 500 })
    }

    // Reset the session state but keep the questions
    const resetSessionState = {
      questions: sessionState.questions, // Keep existing questions
      currentQuestionIndex: 0, // Reset to first question
      currentPhase: 'multiple_choice', // Reset to multiple choice phase
      conversationHistory: [] // Clear conversation history
    }

    // Update the session with reset state and mark as active
    const { error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({ 
        summary: JSON.stringify(resetSessionState),
        started_at: new Date().toISOString(), // Reset start time
        ended_at: null, // Clear end time
        understanding_level: null, // Clear understanding level
        status: "active" // Ensure session is active after reset
      })
      .eq("id", activeSession.id)

    if (updateError) {
      console.error("Error updating session:", updateError)
      return NextResponse.json({ 
        error: "Failed to reset session state" 
      }, { status: 500 })
    }

    // Clear any concept progress for this session
    const { error: progressError } = await supabaseAdmin
      .from("concept_progress")
      .delete()
      .eq("session_id", activeSession.id)

    if (progressError) {
      console.error("Error clearing concept progress:", progressError)
    }

    // Clear multiple choice attempts for this session (this is what teacher dashboard reads from)
    const { error: attemptsError } = await supabaseAdmin
      .from("multiple_choice_attempts")
      .delete()
      .eq("session_id", activeSession.id)

    if (attemptsError) {
      console.error("Error clearing multiple choice attempts:", attemptsError)
    }

    // Clear dynamic hints for this session
    const { error: hintsError } = await supabaseAdmin
      .from("dynamic_hints")
      .delete()
      .eq("session_id", activeSession.id)

    if (hintsError) {
      console.error("Error clearing dynamic hints:", hintsError)
    }

    // Add the first question back as the initial message
    const firstQuestion = sessionState.questions[0]
    if (firstQuestion) {
      await supabaseAdmin.from("chat_messages").insert({
        session_id: activeSession.id,
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

    return NextResponse.json({ 
      success: true, 
      message: "Conversation reset successfully with existing questions.",
      sessionId: activeSession.id,
      questionCount: sessionState.questions.length
    })
  } catch (error: any) {
    console.error("Error in reset conversation API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 