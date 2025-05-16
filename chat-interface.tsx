"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, TreesIcon as Tree } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useChatMessages } from "@/hooks/use-chat-messages"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface ChatInterfaceProps {
  studentId: string
  studentName: string
  lessonId: string
}

export default function ChatInterface({ studentId, studentName, lessonId }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Fetch existing chat sessions for this student and lesson
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = useChatSessions(studentId, lessonId)

  // Fetch chat messages for the active session
  const { messages: chatMessages, isLoading: messagesLoading } = useChatMessages(sessionId || undefined)

  // Format messages for display
  const displayMessages = chatMessages.map((msg) => ({
    role: msg.sender_type === "student" ? ("user" as const) : ("buddy" as const),
    content: msg.content,
    timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }))

  // Start or resume chat session when component mounts
  useEffect(() => {
    if (sessionsError) {
      toast.error(`Error loading sessions: ${sessionsError}`)
      return
    }
    
    if (!sessionsLoading && sessions.length > 0) {
      // Resume the most recent session
      setSessionId(sessions[0].id)
    } else if (!sessionsLoading && sessions.length === 0) {
      // Start a new session
      startNewChatSession()
    }
  }, [sessionsLoading, sessions, sessionsError, studentId, lessonId])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [displayMessages])

  const startNewChatSession = async () => {
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
        throw new Error(data.error || "Failed to start chat session")
      }

      setSessionId(data.session)
    } catch (error) {
      console.error("Error starting chat:", error)
      toast.error(`Failed to start chat: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (input.trim() && sessionId) {
      setIsLoading(true)

      try {
        // Send message to API
        const response = await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            message: input.trim(),
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to send message")
        }

        // Clear input after successful send
        setInput("")
      } catch (error) {
        console.error("Error sending message:", error)
        toast.error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Loading state
  if (sessionsLoading) {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent mb-4"></div>
            <p className="text-muted-foreground">Loading chat history...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messagesLoading ? (
            // Loading skeleton for messages
            <div className="space-y-4">
              <div className="flex">
                <div className="flex gap-2 max-w-[85%]">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-20 w-64 rounded-lg" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="space-y-1">
                  <Skeleton className="h-12 w-48 rounded-lg" />
                  <div className="flex justify-end">
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Actual messages
            displayMessages.map((message, index) => (
              <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "")}>
                <div className={cn("flex gap-2 max-w-[85%]", message.role === "user" ? "" : "")}>
                  {message.role === "buddy" && (
                    <div className="h-8 w-8 rounded-full bg-green-600 flex-shrink-0 flex items-center justify-center">
                      <Tree className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className={cn("p-3 rounded-lg", message.role === "buddy" ? "bg-muted/50" : "bg-green-100")}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className={cn("flex items-center gap-2", message.role === "user" ? "justify-end" : "")}>
                      <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[85%]">
                <div className="h-8 w-8 rounded-full bg-green-600 flex-shrink-0 flex items-center justify-center">
                  <Tree className="h-4 w-4 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex space-x-2">
                      <div
                        className="h-2 w-2 bg-green-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="h-2 w-2 bg-green-600 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                      <div
                        className="h-2 w-2 bg-green-600 rounded-full animate-bounce"
                        style={{ animationDelay: "600ms" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Textarea
            placeholder="Explain what you learned to Oakie..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32"
            disabled={isLoading || messagesLoading || !sessionId}
          />
          <Button
            onClick={handleSendMessage}
            className="px-4 bg-green-600 hover:bg-green-700"
            disabled={isLoading || messagesLoading || !sessionId || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
