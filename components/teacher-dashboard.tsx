"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, TreesIcon as Tree, ChevronRight, Trash2 } from "lucide-react"
import TeacherLessonView from "./teacher-lesson-view"
import TeacherClassView from "./teacher-class-view"
import { useCourses } from "@/hooks/use-courses"
import { Skeleton } from "@/components/ui/skeleton"
import AddCourseDialog from "./teacher/AddCourseDialog"
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

// Define view types
type TeacherView = "dashboard" | "class" | "lesson"

interface TeacherDashboardProps {
  onBack: () => void
}

export default function TeacherDashboard({ onBack }: TeacherDashboardProps) {
  // State for current view and selected course/lesson
  const [currentView, setCurrentView] = useState<TeacherView>("dashboard")
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)

  // Fetch courses from Supabase
  const { courses, isLoading, error, refetch } = useCourses()

  // Handle class click
  const handleClassClick = (course: any) => {
    setSelectedCourse(course)
    setCurrentView("class")
  }

  // Handle lesson click
  const handleLessonClick = (lesson: any) => {
    setSelectedLesson(lesson)
    setCurrentView("lesson")
  }

  // Handle back navigation
  const handleBack = () => {
    if (currentView === "lesson") {
      setCurrentView("class")
    } else if (currentView === "class") {
      setCurrentView("dashboard")
    } else {
      onBack()
    }
  }

  // Handle course deletion
  const handleDeleteCourse = async (courseId: string) => {
    setDeletingCourseId(courseId)
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete course")
      }

      // Refetch courses after successful deletion
      refetch()
    } catch (error) {
      console.error("Error deleting course:", error)
      alert("Failed to delete course. Please try again.")
    } finally {
      setDeletingCourseId(null)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Courses</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tree className="h-8 w-8 text-green-600" />
            <span className="font-bold text-xl">OakTree</span>
            <span className="text-sm text-muted-foreground ml-2">Teacher Dashboard</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentView === "dashboard" ? "Switch Role" : "Back"}
          </Button>
        </div>
      </header>

      {/* Main content */}
      {currentView === "dashboard" && (
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">My Courses</h1>
            <AddCourseDialog onCourseAdded={refetch} />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div>
                        <Skeleton className="h-6 w-40 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="border rounded-lg p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => handleClassClick(course)}
                    >
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{course.title}</h2>
                        <p className="text-sm text-muted-foreground">
                          {course.description || "No description provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => e.stopPropagation()} // Prevent triggering the course click
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{course.title}</strong>? This will permanently remove the course
                              and ALL its lessons and materials. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCourse(course.id)}
                              className="bg-red-500 hover:bg-red-600"
                              disabled={deletingCourseId === course.id}
                            >
                              {deletingCourseId === course.id ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight 
                        className="h-5 w-5 text-muted-foreground" 
                        onClick={() => handleClassClick(course)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center">
              <h3 className="text-lg font-medium mb-2">No Courses Yet</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first course</p>
            </div>
          )}
        </main>
      )}

      {/* Class View */}
      {currentView === "class" && selectedCourse && (
        <TeacherClassView course={selectedCourse} onLessonClick={handleLessonClick} />
      )}

      {/* Lesson View */}
      {currentView === "lesson" && selectedLesson && <TeacherLessonView lesson={selectedLesson} />}

      {/* Footer */}
      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; 2025 OakTree. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
