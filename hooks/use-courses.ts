"use client"

import { useState, useEffect, useCallback } from "react"
import type { Course } from "@/lib/supabase"

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/courses")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch courses")
      }

      setCourses(data.courses)
    } catch (err: any) {
      console.error("Error fetching courses:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return { courses, isLoading, error, refetch: fetchCourses }
}
