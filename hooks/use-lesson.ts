"use client"

import { useState, useEffect, useCallback } from "react"
import type { Lesson } from "@/lib/supabase"

export function useLesson(lessonId?: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLesson = useCallback(async () => {
    if (!lessonId) {
      setLesson(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/lessons/${lessonId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch lesson")
      }

      setLesson(data.lesson)
    } catch (err: any) {
      console.error("Error fetching lesson:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    fetchLesson()
  }, [fetchLesson])

  return { lesson, isLoading, error, refetch: fetchLesson }
} 