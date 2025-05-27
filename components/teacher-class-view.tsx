"use client"

import { Button } from "@/components/ui/button"
import { BookOpen, Users, BarChart2, Trash2 } from "lucide-react"
import AddLessonButton from "./teacher/AddLessonButton"
import { useLessons } from "@/hooks/use-lessons"
import { Skeleton } from "@/components/ui/skeleton"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface TeacherClassViewProps {
  course: any
  onLessonClick: (lesson: any) => void
}

export default function TeacherClassView({ course, onLessonClick }: TeacherClassViewProps) {
  const { lessons, isLoading, error, refetch } = useLessons(course.id)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null)
  const router = useRouter()

  // Handle course deletion
  const handleDeleteCourse = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete course")
      }

      // Navigate back to dashboard by refreshing
      router.refresh()
      // The parent component will show the dashboard since the course is deleted
    } catch (error) {
      console.error("Error deleting course:", error)
      alert("Failed to delete course. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle lesson deletion
  const handleDeleteLesson = async (lessonId: string) => {
    setDeletingLessonId(lessonId)
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete lesson")
      }

      // Refetch lessons after successful deletion
      refetch()
    } catch (error) {
      console.error("Error deleting lesson:", error)
      alert("Failed to delete lesson. Please try again.")
    } finally {
      setDeletingLessonId(null)
    }
  }

  // Get understanding level text and color
  const getUnderstandingLevel = (lessonId: string) => {
    // TODO: Fetch actual understanding data from API
    // For now, showing placeholder text
    return { text: "View Details", color: "text-blue-600" }
  }

  if (error) {
    return (
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
          <p className="text-red-600">Error loading lessons: {error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <div className="flex gap-2">
            <AddLessonButton courseId={course.id} onLessonAdded={refetch} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Students enrolled</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{isLoading ? "..." : lessons.length} Lessons</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <BarChart2 className="h-4 w-4" />
            <span>Understanding Analytics</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Lessons</h2>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-64 mb-1" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : lessons.length > 0 ? (
        <div className="space-y-4">
          {lessons.map((lesson) => {
            const understanding = getUnderstandingLevel(lesson.id)

            return (
              <div
                key={lesson.id}
                className="border rounded-lg p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => onLessonClick(lesson)}
                  >
                    <h3 className="text-lg font-medium mb-1">
                      Week {lesson.week_number} - Lesson {lesson.lesson_number}: {lesson.topic}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Student understanding:
                      <span className={understanding.color + " ml-1"}>{understanding.text}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{lesson.topic}"? This will permanently remove the lesson and all associated materials.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="bg-red-500 hover:bg-red-600"
                            disabled={deletingLessonId === lesson.id}
                          >
                            {deletingLessonId === lesson.id ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onLessonClick(lesson)
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No Lessons Yet</h3>
          <p className="text-muted-foreground mb-4">Get started by adding your first lesson to this course</p>
        </div>
      )}
    </main>
  )
}
