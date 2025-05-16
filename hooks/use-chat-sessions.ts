"use client"

import { useState, useEffect } from "react"
import type { ChatSession } from "@/lib/supabase"

export function useChatSessions(studentId: string, lessonId?: string) {
  const [sessions, setSessions] = useState<(ChatSession & { lessons: any })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    
    async function fetchChatSessions() {
      if (!studentId) {
        setSessions([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        let url = `/api/chat-sessions/student/${studentId}`
        if (lessonId) {
          url += `?lessonId=${lessonId}`
        }

        const response = await fetch(url)
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (isMounted) {
          setSessions(data.sessions)
        }
      } catch (err: any) {
        console.error("Error fetching chat sessions:", err)
        if (isMounted) {
          setError(err.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchChatSessions()
    
    return () => {
      isMounted = false
    }
  }, [studentId, lessonId])

  return { sessions, isLoading, error }
}
