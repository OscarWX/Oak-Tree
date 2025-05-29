"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, BookOpen, Lightbulb, Trophy, ArrowRight, RotateCcw, Loader2, Send, MessageCircle, RefreshCw } from "lucide-react"
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
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [isComplete, setIsComplete] = useState(false)
  const [showReading, setShowReading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [showHint, setShowHint] = useState(false)
  const [dynamicHint, setDynamicHint] = useState<string>("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch lesson details
  const { lesson, isLoading: lessonLoading } = useLesson(lessonId)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Initialize or resume session when component mounts
  useEffect(() => {
    checkAndInitializeSession()
  }, [studentId, lessonId])

  const checkAndInitializeSession = async () => {
    console.log(`Checking session for student ${studentId}, lesson ${lessonId}`)
    setIsLoading(true)
    
    try {
      // Always call the API - it will handle checking for existing sessions
      const response = await fetch("/api/chat/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, lessonId }),
      })

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const text = await response.text()
        console.error("API error response:", text)
        
        // Try to parse as JSON if possible
        try {
          const data = JSON.parse(text)
          if (data.chatNotAvailable) {
            toast.error(data.error)
            setIsLoading(false)
            return
          }
          throw new Error(data.error || "Failed to start learning session")
        } catch (parseError) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()

      console.log(`Session state:`, { 
        sessionId: data.sessionId, 
        resumed: data.resumed,
        currentPhase: data.currentPhase,
        progress: data.progress,
        isCompleted: data.isCompleted
      })

      // Set all session state
      setSessionId(data.sessionId)
      setCurrentQuestion(data.currentQuestion)
      setCurrentPhase(data.currentPhase || 'multiple_choice')
      setProgress(data.progress || { current: 0, total: 0, percentage: 0 })

      // Check if session is complete (from API or progress)
      if (data.isCompleted || data.currentPhase === 'completed' || 
          (data.progress && data.progress.current === data.progress.total && data.progress.total > 0)) {
        setIsComplete(true)
      }

      // Handle messages based on session state
      if (data.resumed) {
        console.log(`Resuming existing session ${data.sessionId}`)
        await loadExistingMessages(data.sessionId)
      } else if (!data.isCompleted) {
        console.log(`Starting new session ${data.sessionId}`)
        // Add Chirpy's initial greeting for new sessions
        if (data.currentQuestion) {
          setChatMessages([{
            id: Date.now().toString(),
            type: 'chirpy',
            content: data.currentQuestion.multipleChoiceQuestion,
            options: data.currentQuestion.options,
            timestamp: new Date()
          }])
        }
      }

    } catch (error) {
      console.error("Error checking session:", error)
      toast.error(`Failed to load session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const resetSessionState = () => {
    setSessionId(null)
    setCurrentQuestion(null)
    setCurrentPhase('multiple_choice')
    setSelectedOption(null)
    setExampleText("")
    setProgress({ current: 0, total: 0, percentage: 0 })
    setIsComplete(false)
    setChatMessages([])
    setShowHint(false)
    setDynamicHint("")
  }

  const loadExistingMessages = async (sessionId: string) => {
    console.log(`Loading existing messages for session ${sessionId}`)
    try {
      const response = await fetch(`/api/chat-messages/session/${sessionId}`)
      if (!response.ok) throw new Error('Failed to load messages')
      
      const data = await response.json()
      const messages = data.messages || []
      
      console.log(`Loaded ${messages.length} existing messages`)
      
      // Convert stored messages to ChatMessage format
      const chatMessages: ChatMessage[] = messages.map((msg: any, index: number) => {
        let content = msg.content
        let options = undefined
        let selectedOption = undefined
        let isCorrect = undefined
        
        // Parse JSON content if it exists
        if (typeof msg.content === 'string' && msg.content.startsWith('{')) {
          try {
            const jsonContent = JSON.parse(msg.content)
            
            // Handle different message types
            if (jsonContent.type === 'multiple_choice') {
              content = jsonContent.message
              options = jsonContent.options
            } else if (jsonContent.type === 'multiple_choice_answer') {
              // Student's multiple choice answer
              const optionLetter = jsonContent.selectedOption?.toUpperCase() || ''
              content = `Option ${optionLetter}`
              selectedOption = jsonContent.selectedOption
              isCorrect = jsonContent.isCorrect
            } else if (jsonContent.type === 'example_submission') {
              // Student's example submission
              content = jsonContent.example
            } else if (jsonContent.type === 'feedback') {
              // Sage's feedback
              content = jsonContent.message
              isCorrect = jsonContent.isPositive
            } else if (jsonContent.type === 'example_request') {
              // Chirpy's example request
              content = jsonContent.message
            } else {
              // Default to message or content field
              content = jsonContent.message || jsonContent.content || msg.content
              options = jsonContent.options
            }
          } catch (e) {
            // If parsing fails, check if it's Chirpy's final message
            if (msg.sender_type === 'ai' && content.includes('Chirpy:')) {
              // Remove "Chirpy: " prefix if it exists
              content = content.replace(/^Chirpy:\s*/, '')
            }
            console.warn(`Failed to parse message content for message ${msg.id}:`, e)
          }
        }
        
        // Determine message type based on sender
        let messageType: 'chirpy' | 'student' | 'sage' = 'chirpy'
        if (msg.sender_type === 'student') {
          messageType = 'student'
        } else if (msg.sender_type === 'ai') {
          // Check if it's Sage based on content
          if (typeof msg.content === 'string' && msg.content.includes('"type":"feedback"')) {
            messageType = 'sage'
          } else {
            messageType = 'chirpy'
          }
        } else if (msg.sender_type === 'sage') {
          messageType = 'sage'
        }
        
        return {
          id: msg.id || index.toString(),
          type: messageType,
          content: content,
          options: options,
          selectedOption: selectedOption,
          isCorrect: isCorrect,
          timestamp: new Date(msg.timestamp)
        }
      })
      
      console.log(`Converted messages:`, chatMessages.map(m => ({ 
        type: m.type, 
        hasOptions: !!m.options,
        contentLength: m.content?.length || 0 
      })))
      
      setChatMessages(chatMessages)
      
      // Check for completion state after loading messages
      if (chatMessages.length > 0) {
        const lastMessages = chatMessages.slice(-5) // Check last 5 messages
        const hasCompletionMessage = lastMessages.some(msg => 
          msg.content.includes("Congratulations") || 
          msg.content.includes("completed all the concepts") ||
          msg.content.includes("Thank you so much for teaching me")
        )
        if (hasCompletionMessage) {
          console.log("Session appears to be completed based on messages")
          setIsComplete(true)
        }
      }
    } catch (error) {
      console.error("Error loading existing messages:", error)
      // Don't show error to user, just start fresh if loading fails
      toast.warning("Could not load conversation history. Starting fresh.")
      setChatMessages([])
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
            setDynamicHint(data.hint)
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
        setDynamicHint("")
        
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
        if (data.hint) {
          setDynamicHint(data.hint)
          if (!showHint) {
            setShowHint(true)
          }
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
    if (!confirm("Are you sure you want to reset your progress? This will clear your conversation but keep the same questions.")) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/chat/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, lessonId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset conversation")
      }

      // Reset all state
      resetSessionState()

      toast.success("Conversation reset successfully! Starting over with the same questions...")
      
      // Reload the session to start fresh
      setTimeout(() => {
        checkAndInitializeSession()
      }, 500)

    } catch (error) {
      console.error("Error resetting conversation:", error)
      toast.error(`Failed to reset conversation: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
          <Button onClick={checkAndInitializeSession}>Try Again</Button>
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
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Restart with Same Questions
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
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restart with Same Questions
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
                  {showHint && (dynamicHint || currentQuestion.exampleHint) && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-md">
                      <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        {dynamicHint || currentQuestion.exampleHint}
                      </p>
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
