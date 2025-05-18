"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface Message {
  id?: string
  role: "buddy" | "user"
  content: string
  timestamp: string
  character?: "chirpy" | "sage"
}

interface ChatInterfaceProps {
  studentId: string
  lessonId: string
  onSessionEnd?: (analysis: any) => void
}

export default function ChatInterface({ studentId, lessonId, onSessionEnd }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isChatStarted, setIsChatStarted] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Start chat session when component mounts
  useEffect(() => {
    if (!isChatStarted) {
      startChatSession()
    }
  }, [isChatStarted])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Determine character from message content
  const getCharacterFromMessage = (content: string): "chirpy" | "sage" | undefined => {
    if (content.startsWith("Chirpy:")) return "chirpy"
    if (content.startsWith("Sage:")) return "sage"
    return undefined
  }

  // Parse message content to remove character prefix
  const parseMessageContent = (content: string): string => {
    if (content.startsWith("Chirpy:")) {
      return content.replace("Chirpy:", "").trim()
    }
    if (content.startsWith("Sage:")) {
      return content.replace("Sage:", "").trim()
    }
    return content
  }

  const startChatSession = async () => {
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

      const character = getCharacterFromMessage(data.message)
      const content = parseMessageContent(data.message)

      setSessionId(data.session)
      setMessages([
        {
          role: "buddy",
          content: content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          character: character
        },
      ])
      setIsChatStarted(true)
    } catch (error) {
      console.error("Error starting chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (input.trim() && sessionId) {
      // Add user message to UI immediately
      const userMessage: Message = {
        role: "user",
        content: input.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput("")
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
            message: userMessage.content,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to send message")
        }

        const character = getCharacterFromMessage(data.message)
        const content = parseMessageContent(data.message)

        // Add AI response to messages - use a callback to ensure state update is applied
        setMessages(prevMessages => [
          ...prevMessages,
          {
            role: "buddy",
            content: content,
            character: character,
            timestamp: new Date(data.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }
        ])
      } catch (error) {
        console.error("Error sending message:", error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleEndSession = async () => {
    if (!sessionId) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/chat/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to end chat session")
      }

      const content = parseMessageContent(data.goodbyeMessage || "Thanks for chatting today!");
      const character = getCharacterFromMessage(data.goodbyeMessage || "");

      // Add final message from Chirpy
      setMessages((prev) => [
        ...prev,
        {
          role: "buddy",
          content: content,
          character: character || "chirpy",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])

      // Call the onSessionEnd callback with the analysis
      if (onSessionEnd) {
        onSessionEnd(data.analysis)
      }
    } catch (error) {
      console.error("Error ending session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Get avatar for character
  const getCharacterAvatar = (character?: "chirpy" | "sage") => {
    if (character === "sage") {
      return "/images/characters/sage-owl.svg"
    }
    return "/images/characters/chirpy-bluejay.svg"
  }

  // Get character name
  const getCharacterName = (character?: "chirpy" | "sage") => {
    if (character === "sage") {
      return "Sage the Owl"
    }
    return "Chirpy the Blue Jay"
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "")}>
              <div className={cn("flex gap-2 max-w-[85%]", message.role === "user" ? "" : "")}>
                {message.role === "buddy" && (
                  <div className={cn(
                    "h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden",
                    message.character === "sage" 
                      ? "border-2 border-amber-600" 
                      : "border-2 border-blue-500"
                  )}>
                    <Image 
                      src={getCharacterAvatar(message.character)}
                      alt={message.character || "character"}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <div className={cn(
                    "p-3 rounded-lg", 
                    message.role === "buddy" 
                      ? message.character === "sage" 
                        ? "bg-amber-50 border border-amber-200" 
                        : "bg-blue-50 border border-blue-200"
                      : "bg-green-100"
                  )}>
                    {message.role === "buddy" && message.character && (
                      <div className="mb-1 font-medium text-xs">
                        {getCharacterName(message.character)}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <div className={cn("flex items-center gap-2", message.role === "user" ? "justify-end" : "")}>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[85%]">
                <div className="h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-blue-500">
                  <Image 
                    src="/images/characters/chirpy-bluejay.svg"
                    alt="Chirpy thinking..."
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex space-x-2">
                      <div
                        className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                      <div
                        className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
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
            placeholder="Explain what you know to Chirpy..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32"
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSendMessage}
              className="px-4 bg-blue-500 hover:bg-blue-600"
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleEndSession}
              className="px-4 bg-red-500 hover:bg-red-600"
              disabled={isLoading || messages.length < 3}
            >
              End
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
