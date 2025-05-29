"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import ChatInterface from "../../../../../chat-interface"

export default function StudentChatPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId as string
  const lessonId = params.lessonId as string
  const [studentName, setStudentName] = useState<string>("")
  const [lessonTitle, setLessonTitle] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (studentId && lessonId) {
      fetchData()
    }
  }, [studentId, lessonId])

  const fetchData = async () => {
    try {
      // Fetch student data
      const studentResponse = await fetch(`/api/students/${studentId}`)
      const studentData = await studentResponse.json()
      
      if (!studentResponse.ok || !studentData.student) {
        throw new Error("Student not found")
      }
      
      setStudentName(studentData.student.name)

      // Fetch lesson data
      const lessonResponse = await fetch(`/api/lessons/${lessonId}`)
      const lessonData = await lessonResponse.json()
      
      if (!lessonResponse.ok || !lessonData.lesson) {
        throw new Error("Lesson not found")
      }
      
      setLessonTitle(`${lessonData.lesson.topic} - Week ${lessonData.lesson.week_number}, Lesson ${lessonData.lesson.lesson_number}`)
      
    } catch (error) {
      console.error("Error fetching data:", error)
      setError(error instanceof Error ? error.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/student/${studentId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top Navigation */}
      <div className="h-12 border-b bg-background/95 backdrop-blur">
        <header className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h2 className="text-sm font-medium text-muted-foreground">
              {lessonTitle}
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">
            Student: {studentName}
          </div>
        </header>
      </div>

      {/* Chat Interface */}
      <div className="flex-1">
        <ChatInterface 
          studentId={studentId} 
          studentName={studentName} 
          lessonId={lessonId} 
        />
      </div>
    </div>
  )
} 