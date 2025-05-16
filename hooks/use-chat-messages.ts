"use client"

import { useState, useEffect } from "react"
import type { ChatMessage } from "@/lib/supabase"

export function useChatMessages(sessionId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    
    async function fetchChatMessages() {
      if (!sessionId) {
        setMessages([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/chat-messages/session/${sessionId}`)
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `API error: ${response.status}`)
        }
        
        const data = await response.json()

        if (isMounted) {
          setMessages(data.messages)
        }
      } catch (err: any) {
        console.error("Error fetching chat messages:", err)
        if (isMounted) {
          setError(err.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchChatMessages()
    
    return () => {
      isMounted = false
    }
  }, [sessionId])

  return { messages, isLoading, error }
}
