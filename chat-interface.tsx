"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, BookOpen, Lightbulb, Trophy, ArrowRight, RotateCcw, Loader2, Send, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLesson } from "@/hooks/use-lesson"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface ChatInterfaceProps {
  studentId: string
  studentName: string
  lessonId: string
}

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

interface ChatMessage {
  id: string
  type: 'chirpy' | 'student' | 'sage'
  content: string
  options?: { a: string; b: string; c: string }
  selectedOption?: string
  isCorrect?: boolean
  timestamp: Date
}

export default function ChatInterface({ studentId, studentName, lessonId }: ChatInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<ConceptQuestion | null>(null)
  const [currentPhase, setCurrentPhase] = useState<'multiple_choice' | 'example'>('multiple_choice')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [exampleText, setExampleText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [isComplete, setIsComplete] = useState(false)
  const [showReading, setShowReading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [showHint, setShowHint] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch lesson details
  const { lesson, isLoading: lessonLoading } = useLesson(lessonId)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Start session when component mounts
  useEffect(() => {
    startLearningSession()
  }, [studentId, lessonId])

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

      setSessionId(data.sessionId)
      setCurrentQuestion(data.currentQuestion)
      setCurrentPhase(data.currentPhase)
      setProgress(data.progress)

      // Add Chirpy's initial greeting
      if (data.currentQuestion) {
        setChatMessages([{
          id: Date.now().toString(),
          type: 'chirpy',
          content: data.currentQuestion.multipleChoiceQuestion,
          options: data.currentQuestion.options,
          timestamp: new Date()
        }])
      }

    } catch (error) {
      console.error("Error starting session:", error)
      toast.error(`Failed to start learning session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const submitMultipleChoice = async () => {
    if (!sessionId || !selectedOption || !currentQuestion) return

    setIsSubmitting(true)
    
    // Add student's answer to chat
    const studentMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'student',
      content: `Option ${selectedOption.toUpperCase()}: ${currentQuestion.options[selectedOption as keyof typeof currentQuestion.options]}`,
      selectedOption,
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, studentMessage])

    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          answer: selectedOption,
          answerType: 'multiple_choice'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit answer")
      }

      // Add Sage's feedback
      const feedbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'sage',
        content: data.feedback,
        isCorrect: data.isCorrect,
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, feedbackMessage])

      if (data.isCorrect) {
        // Move to example phase
        setCurrentPhase('example')
        setSelectedOption(null)
        
        // Add example prompt after a short delay
        setTimeout(() => {
          const exampleMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            type: 'chirpy',
            content: data.examplePrompt,
            timestamp: new Date()
          }
          setChatMessages(prev => [...prev, exampleMessage])
          
          if (data.hint) {
            setShowHint(true)
          }
        }, 1500)
      } else {
        // Show hint for wrong answer and allow retry
        if (data.hint) {
          setTimeout(() => {
            const hintMessage: ChatMessage = {
              id: (Date.now() + 2).toString(),
              type: 'sage',
              content: `💡 ${data.hint}`,
              timestamp: new Date()
            }
            setChatMessages(prev => [...prev, hintMessage])
            
            // After showing hint, show the question options again for retry
            setTimeout(() => {
              const retryMessage: ChatMessage = {
                id: (Date.now() + 3).toString(),
                type: 'sage',
                content: "Try again! " + currentQuestion.multipleChoiceQuestion,
                options: currentQuestion.options,
                timestamp: new Date()
              }
              setChatMessages(prev => [...prev, retryMessage])
              setSelectedOption(null) // Reset selection for retry
            }, 1000)
          }, 1000)
        }
      }

    } catch (error) {
      console.error("Error submitting answer:", error)
      toast.error(`Failed to submit answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitExample = async () => {
    if (!sessionId || !exampleText.trim() || !currentQuestion) return

    setIsSubmitting(true)
    
    // Add student's example to chat
    const studentMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'student',
      content: exampleText.trim(),
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, studentMessage])

    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          answer: exampleText.trim(),
          answerType: 'example'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit example")
      }

      // Add Sage's feedback
      const feedbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'sage',
        content: data.feedback,
        isCorrect: data.isCorrect,
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, feedbackMessage])

      if (data.isCorrect) {
        setExampleText("")
        setShowHint(false)
        
        if (data.isComplete) {
          setIsComplete(true)
          setProgress(data.progress)
        } else if (data.nextQuestion) {
          // Move to next concept after a delay
          setTimeout(() => {
            setCurrentQuestion(data.nextQuestion)
            setCurrentPhase('multiple_choice')
            setProgress(data.progress)
            
            const nextQuestionMessage: ChatMessage = {
              id: (Date.now() + 2).toString(),
              type: 'chirpy',
              content: data.nextQuestion.multipleChoiceQuestion,
              options: data.nextQuestion.options,
              timestamp: new Date()
            }
            setChatMessages(prev => [...prev, nextQuestionMessage])
          }, 2000)
        }
      } else {
        // Show hint for invalid example
        if (data.hint && !showHint) {
          setShowHint(true)
        }
      }

    } catch (error) {
      console.error("Error submitting example:", error)
      toast.error(`Failed to submit example: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
      e.preventDefault()
      if (currentPhase === 'example' && exampleText.trim()) {
        submitExample()
      }
    }
  }

  const cleanConversationHistory = async () => {
    if (!confirm("Are you sure you want to reset all progress? This will delete your conversation history and understanding data for this lesson.")) {
      return
    }

    setIsLoading(true)
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
      setSessionId(null)
      setCurrentQuestion(null)
      setCurrentPhase('multiple_choice')
      setSelectedOption(null)
      setExampleText("")
      setProgress({ current: 0, total: 0, percentage: 0 })
      setIsComplete(false)
      setChatMessages([])
      setShowHint(false)

      toast.success("Conversation history cleaned successfully! Starting fresh...")
      
      // Start a new session
      setTimeout(() => {
        startLearningSession()
      }, 1000)

    } catch (error) {
      console.error("Error cleaning conversation history:", error)
      toast.error(`Failed to clean conversation history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isLoading && !sessionId) {
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

  if (!sessionId) {
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

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
          {!showReading && (
            <div className="text-center mb-4">
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
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Learning with Chirpy</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {progress.current} of {progress.total} concepts
                  </span>
                  <Button
                    onClick={cleanConversationHistory}
                    disabled={isLoading || isSubmitting}
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset Progress
                  </Button>
                </div>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </CardContent>
          </Card>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.type === 'student' ? "justify-end" : "justify-start"
                )}
              >
                {message.type === 'chirpy' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm">🐦</span>
                  </div>
                )}
                
                {message.type === 'sage' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 text-sm">🦉</span>
                  </div>
                )}
                
                <div
                  className={cn(
                    "rounded-lg p-4 max-w-md",
                    message.type === 'chirpy' 
                      ? "bg-blue-50 text-gray-800" 
                      : message.type === 'sage'
                      ? "bg-purple-50 text-gray-800"
                      : "bg-green-50 text-gray-800"
                  )}
                >
                  {message.type === 'chirpy' && (
                    <p className="text-blue-800 font-medium text-sm mb-1">Chirpy</p>
                  )}
                  {message.type === 'sage' && (
                    <p className="text-purple-800 font-medium text-sm mb-1">Sage</p>
                  )}
                  {message.type === 'student' && (
                    <p className="text-green-800 font-medium text-sm mb-1">You</p>
                  )}
                  
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Multiple choice options */}
                  {message.options && (
                    <div className="mt-3 space-y-2">
                      {Object.entries(message.options).map(([key, value]) => (
                        <div
                          key={key}
                          className={cn(
                            "p-3 rounded-md border cursor-pointer transition-colors",
                            selectedOption === key
                              ? message.type === 'sage' 
                                ? "border-purple-500 bg-purple-50"
                                : "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          )}
                          onClick={() => !isSubmitting && setSelectedOption(key)}
                        >
                          <span className="font-medium">{key.toUpperCase()})</span> {value}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Feedback indicators */}
                  {message.isCorrect !== undefined && (
                    <div className={cn(
                      "flex items-center gap-2 mt-2",
                      message.isCorrect ? "text-green-600" : "text-red-600"
                    )}>
                      {message.isCorrect ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>
                
                {message.type === 'student' && (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-sm">👤</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Completion message */}
            {isComplete && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <Trophy className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-green-800 mb-2">Congratulations!</h2>
                  <p className="text-green-700 mb-4">
                    You've completed all the concepts for this lesson. Great job learning about {lesson?.topic}!
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-6">
                    <span className="text-blue-600 text-2xl">🐦</span>
                    <span>Chirpy is proud of your progress!</span>
                  </div>
                  <Button
                    onClick={() => {
                      setIsComplete(false)
                      cleanConversationHistory()
                    }}
                    variant="outline"
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          {!isComplete && currentQuestion && (
            <div className="border-t pt-4">
              {currentPhase === 'multiple_choice' && selectedOption && (
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={submitMultipleChoice}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Answer
                      </>
                    )}
                  </Button>
                </div>
              )}

              {currentPhase === 'example' && (
                <div className="space-y-3">
                  {showHint && currentQuestion.exampleHint && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-md">
                      <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800">{currentQuestion.exampleHint}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={exampleText}
                      onChange={(e) => setExampleText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your example here..."
                      className="flex-1 min-h-[80px] resize-none"
                      disabled={isSubmitting}
                    />
                    <Button
                      onClick={submitExample}
                      disabled={!exampleText.trim() || isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
