"use client"

import { Button } from "@/components/ui/button"
import { BookOpen, Users, BarChart2 } from "lucide-react"
import AddLessonButton from "./teacher/AddLessonButton"
import { useLessons } from "@/hooks/use-lessons"
import { Skeleton } from "@/components/ui/skeleton"

interface TeacherClassViewProps {
  course: any
  onLessonClick: (lesson: any) => void
}

export default function TeacherClassView({ course, onLessonClick }: TeacherClassViewProps) {
  const { lessons, isLoading, error, refetch } = useLessons(course.id)

  // Get understanding level text and color
  const getUnderstandingLevel = (lessonId: string) => {
    // This would ideally be fetched from actual session data
    // For now, we're using a deterministic placeholder based on the lesson ID
    const hash = lessonId.split("").reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)

    const percentage = (hash % 40) + 50 // Random between 50-90%

    if (percentage >= 80) return { text: `Good (${percentage}%)`, color: "text-green-600" }
    if (percentage >= 65) return { text: `Moderate (${percentage}%)`, color: "text-yellow-600" }
    return { text: `Needs Review (${percentage}%)`, color: "text-orange-600" }
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
          <AddLessonButton courseId={course.id} onLessonAdded={refetch} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>3 Students</span> {/* This would be fetched from actual enrollment data */}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{isLoading ? "..." : lessons.length} Lessons</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <BarChart2 className="h-4 w-4" />
            <span>Avg. Progress: 68%</span> {/* This would be calculated from actual session data */}
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
                className="border rounded-lg p-5 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => onLessonClick(lesson)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">
                      Week {lesson.week_number} - Lesson {lesson.lesson_number}: {lesson.topic}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Student understanding:
                      <span className={understanding.color + " ml-1"}>{understanding.text}</span>
                    </p>
                  </div>
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
