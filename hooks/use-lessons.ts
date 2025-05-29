"use client"

import { useState, useEffect, useCallback } from "react"
import type { Lesson } from "@/lib/supabase"

export function useLessons(courseId?: string) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLessons = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const url = courseId ? `/api/lessons?courseId=${courseId}` : '/api/lessons'
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch lessons")
      }

      setLessons(data.lessons)
    } catch (err: any) {
      console.error("Error fetching lessons:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchLessons()
  }, [fetchLessons])

  return { lessons, isLoading, error, refetch: fetchLessons }
}
