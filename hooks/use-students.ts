"use client"

import { useState, useEffect } from "react"
import type { Student } from "@/lib/supabase"

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudents() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch("/api/students")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch students")
        }

        setStudents(data.students)
      } catch (err: any) {
        console.error("Error fetching students:", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [])

  return { students, isLoading, error }
}
