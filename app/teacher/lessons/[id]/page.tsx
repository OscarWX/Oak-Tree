"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import LessonMaterialsTab from "@/components/teacher/LessonMaterialsTab"
import StudentUnderstandingTab from "@/components/teacher/StudentUnderstandingTab"
import { supabase } from "@/lib/supabase"
import type { Lesson } from "@/lib/supabase"

export default function LessonPage() {
  const params = useParams()
  const lessonId = params.id as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLessonDetails()
  }, [lessonId])

  const fetchLessonDetails = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("lessons").select("*, courses(*)").eq("id", lessonId).single()

      if (error) throw error
      setLesson(data)
    } catch (error) {
      console.error("Error fetching lesson:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
        <Button asChild>
          <Link href="/teacher/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  const lessonTitle = `Week ${lesson.week_number} - Lesson ${lesson.lesson_number}: ${lesson.topic}`

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/teacher/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{lessonTitle}</h1>
        <p className="text-muted-foreground">{lesson.courses?.title}</p>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="understanding">Student Understanding</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <LessonMaterialsTab lessonId={lessonId} lessonTitle={lessonTitle} />
        </TabsContent>

        <TabsContent value="understanding">
          <StudentUnderstandingTab lessonId={lessonId} lessonTitle={lessonTitle} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
