"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, BookOpen, Lightbulb, Trophy, ArrowRight, RotateCcw, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLesson } from "@/hooks/use-lesson"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface ChatInterfaceProps {
  studentId: string
  studentName: string
  lessonId: string
}

interface Question {
  concept: string
  chirpyQuestion: string
  studentResponse: string
  answer: string
  hint: string
}

interface SessionData {
  sessionId: string
  questions: Question[]
  currentQuestionIndex: number
  totalQuestions: number
}

export default function ChatInterface({ studentId, studentName, lessonId }: ChatInterfaceProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [isComplete, setIsComplete] = useState(false)
  const [showReading, setShowReading] = useState(true)
  const [isCleaningHistory, setIsCleaningHistory] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{
    chirpyQuestion: string
    studentResponse: string
    studentAnswer: string
    concept: string
  }>>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch lesson details
  const { lesson, isLoading: lessonLoading } = useLesson(lessonId)

  // Start session when component mounts
  useEffect(() => {
    startLearningSession()
  }, [studentId, lessonId])

  // Focus input when question changes
  useEffect(() => {
    if (sessionData && inputRef.current) {
      inputRef.current.focus()
    }
  }, [sessionData?.currentQuestionIndex])

  const startLearningSession = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/chat/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, lessonId }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.chatNotAvailable) {
          toast.error(data.error)
          return
        }
        throw new Error(data.error || "Failed to start learning session")
      }

      setSessionData({
        sessionId: data.session,
        questions: data.questions,
        currentQuestionIndex: data.currentQuestionIndex,
        totalQuestions: data.totalQuestions
      })

      setProgress({
        current: 1,
        total: data.totalQuestions,
        percentage: 0
      })

    } catch (error) {
      console.error("Error starting session:", error)
      toast.error(`Failed to start learning session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (!sessionData || !currentAnswer.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          answer: currentAnswer.trim(),
          questionIndex: sessionData.currentQuestionIndex,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit answer")
      }

      // Update feedback and state
      setIsCorrect(data.isCorrect)
      setFeedback(data.feedback)
      setHint(data.hint)
      setShowHint(!!data.hint)
      setCorrectAnswer(data.correctAnswer)
      setShowCorrectAnswer(!data.isCorrect)
      setProgress(data.progress)
      setIsComplete(data.isComplete)

      // If correct, move to next question after a delay
      if (data.isCorrect && !data.isComplete) {
        setTimeout(() => {
          moveToNextQuestion(data.nextQuestionIndex)
        }, 2000)
      }

    } catch (error) {
      console.error("Error submitting answer:", error)
      toast.error(`Failed to submit answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const moveToNextQuestion = (nextIndex: number) => {
    if (!sessionData || !currentQuestion) return

    // Add the completed exchange to conversation history
    const completedExchange = {
      chirpyQuestion: currentQuestion.chirpyQuestion,
      studentResponse: currentQuestion.studentResponse,
      studentAnswer: currentAnswer,
      concept: currentQuestion.concept
    }
    
    setConversationHistory(prev => [...prev, completedExchange])

    setSessionData({
      ...sessionData,
      currentQuestionIndex: nextIndex
    })
    
    // Reset state for next question
    setCurrentAnswer("")
    setFeedback(null)
    setShowHint(false)
    setHint(null)
    setIsCorrect(null)
    setShowCorrectAnswer(false)
    setCorrectAnswer(null)
  }

  const tryAgain = () => {
    setCurrentAnswer("")
    setFeedback(null)
    setShowHint(false)
    setHint(null)
    setIsCorrect(null)
    setShowCorrectAnswer(false)
    setCorrectAnswer(null)
  }

  const cleanConversationHistory = async () => {
    if (!confirm("Are you sure you want to reset all progress? This will delete your conversation history and understanding data for this lesson.")) {
      return
    }

    setIsCleaningHistory(true)
    try {
      const response = await fetch("/api/chat/clean", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, lessonId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to clean conversation history")
      }

      // Reset all state
      setSessionData(null)
      setCurrentAnswer("")
      setFeedback(null)
      setShowHint(false)
      setHint(null)
      setIsCorrect(null)
      setShowCorrectAnswer(false)
      setCorrectAnswer(null)
      setProgress({ current: 0, total: 0, percentage: 0 })
      setIsComplete(false)
      setConversationHistory([])

      toast.success("Conversation history cleaned successfully! Starting fresh...")
      
      // Start a new session
      setTimeout(() => {
        startLearningSession()
      }, 1000)

    } catch (error) {
      console.error("Error cleaning conversation history:", error)
      toast.error(`Failed to clean conversation history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCleaningHistory(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && currentAnswer.trim()) {
      e.preventDefault()
      submitAnswer()
    }
  }

  const startOver = () => {
    setIsComplete(false)
    setSessionData(null)
    setCurrentAnswer("")
    setFeedback(null)
    setShowHint(false)
    setHint(null)
    setIsCorrect(null)
    setShowCorrectAnswer(false)
    setCorrectAnswer(null)
    setProgress({ current: 0, total: 0, percentage: 0 })
    setConversationHistory([])
    startLearningSession()
  }

  // Loading state
  if (isLoading && !sessionData) {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent mb-4"></div>
            <p className="text-muted-foreground">Preparing your learning session...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Unable to Start Session</h2>
          <p className="text-muted-foreground mb-4">
            Please make sure the lesson has been properly set up with key concepts.
          </p>
          <Button onClick={startLearningSession}>Try Again</Button>
        </div>
      </div>
    )
  }

  const currentQuestion = sessionData.questions[sessionData.currentQuestionIndex]

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Pre-class Reading Section */}
      {showReading && (
        <div className="p-4 border-b bg-muted/10">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-green-600" />
                <h3 className="font-medium text-sm">Pre-class Reading</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowReading(false)}
                className="h-7 text-xs"
              >
                Hide
              </Button>
            </div>
            
            {lessonLoading ? (
              <div className="space-y-3 my-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : lesson?.preclass_reading ? (
              <div className="bg-white rounded-md p-4 shadow-sm text-sm">
                <h4 className="font-medium mb-2">{lesson.topic}</h4>
                <div className="prose prose-sm prose-green max-w-none">
                  {lesson.preclass_reading.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-3 text-muted-foreground">{paragraph}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-md p-4 shadow-sm text-sm text-center text-muted-foreground">
                No pre-class reading available for this lesson.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Learning Interface */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {!showReading && (
            <div className="text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowReading(true)}
                className="text-xs"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Show Pre-class Reading
              </Button>
            </div>
          )}

          {/* Progress Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img src="/avatars/chirpy.png" alt="Chirpy" className="h-6 w-6 rounded-full" />
                  <span className="text-sm font-medium">Learning Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {progress.current} of {progress.total} concepts
                  </span>
                  <Button
                    onClick={cleanConversationHistory}
                    disabled={isCleaningHistory || isLoading}
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {isCleaningHistory ? (
                      <>
                        <div className="animate-spin h-3 w-3 border-2 border-red-600 rounded-full border-t-transparent mr-1"></div>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset Progress
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </CardContent>
          </Card>

          {/* Completion Screen */}
          {isComplete ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-8 text-center">
                <Trophy className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-800 mb-2">Congratulations!</h2>
                <p className="text-green-700 mb-4">
                  You've completed all the concepts for this lesson. Great job learning about {lesson?.topic}!
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-6">
                  <img src="/avatars/chirpy.png" alt="Chirpy" className="h-5 w-5 rounded-full" />
                  <span>Chirpy is proud of your progress!</span>
                </div>
                <Button
                  onClick={startOver}
                  disabled={isCleaningHistory}
                  variant="outline"
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  {isCleaningHistory ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-green-600 rounded-full border-t-transparent mr-2"></div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Over
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Conversation History */}
              {conversationHistory.length > 0 && (
                <div className="space-y-4">
                  {conversationHistory.map((exchange, index) => (
                    <div key={index} className="space-y-3">
                      {/* Chirpy's Question */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-sm">🐦</span>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 max-w-md">
                          <p className="text-blue-800 font-medium text-sm">Chirpy</p>
                          <p className="text-gray-700">{exchange.chirpyQuestion}</p>
                        </div>
                      </div>

                      {/* Student's Response */}
                      <div className="flex items-start gap-3 justify-end">
                        <div className="bg-green-50 rounded-lg p-4 max-w-md">
                          <p className="text-green-800 font-medium text-sm">You</p>
                          <p className="text-gray-700">
                            {exchange.studentResponse.replace('_____', exchange.studentAnswer)}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 text-sm">👤</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Question */}
              {currentQuestion && (
                <div className="space-y-4">
                  {/* Chirpy's Current Question */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-sm">🐦</span>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 max-w-md">
                      <p className="text-blue-800 font-medium text-sm">Chirpy</p>
                      <p className="text-gray-700">{currentQuestion.chirpyQuestion}</p>
                    </div>
                  </div>

                  {/* Student's Response Input */}
                  <div className="flex items-start gap-3 justify-end">
                    <div className="bg-green-50 rounded-lg p-4 max-w-md w-full">
                      <p className="text-green-800 font-medium text-sm mb-2">You</p>
                      <div className="text-gray-700">
                        {currentQuestion.studentResponse.split('_____').map((part, index) => (
                          <span key={index}>
                            {part}
                            {index < currentQuestion.studentResponse.split('_____').length - 1 && (
                              <input
                                ref={inputRef}
                                type="text"
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && currentAnswer.trim()) {
                                    submitAnswer()
                                  }
                                }}
                                className="inline-block mx-1 px-2 py-1 border-b-2 border-blue-300 bg-transparent focus:border-blue-500 focus:outline-none min-w-[100px] text-center"
                                placeholder="your answer"
                                disabled={isCorrect === true}
                              />
                            )}
                          </span>
                        ))}
                      </div>

                      {/* Feedback */}
                      {feedback && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-medium">{feedback}</span>
                          </div>
                        </div>
                      )}

                      {/* Hint */}
                      {showHint && hint && (
                        <div className="mt-3 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-600" />
                            <span className="font-medium">Hint: {hint}</span>
                          </div>
                        </div>
                      )}

                      {/* Correct Answer */}
                      {showCorrectAnswer && correctAnswer && (
                        <div className="mt-3 p-3 bg-blue-100 text-blue-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            <span className="font-medium">Answer: {correctAnswer}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-4 flex gap-2">
                        {!isCorrect && currentAnswer.trim() && (
                          <button
                            onClick={submitAnswer}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            Submit
                          </button>
                        )}

                        {!isCorrect && !showHint && (
                          <button
                            onClick={() => {
                              setShowHint(true)
                              setHint(currentQuestion?.hint || "")
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                          >
                            <Lightbulb className="w-4 h-4" />
                            Get Hint
                          </button>
                        )}

                        {!isCorrect && !showCorrectAnswer && (
                          <button
                            onClick={() => {
                              setShowCorrectAnswer(true)
                              setCorrectAnswer(currentQuestion?.answer || "")
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                          >
                            <BookOpen className="w-4 h-4" />
                            Show Answer
                          </button>
                        )}

                        {isCorrect && (
                          <button
                            onClick={() => {
                              const nextIndex = sessionData.currentQuestionIndex + 1
                              if (nextIndex >= sessionData.totalQuestions) {
                                setIsComplete(true)
                              } else {
                                moveToNextQuestion(nextIndex)
                              }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-sm">👤</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
