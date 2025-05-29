"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookOpen, ChevronLeft, Menu, ChevronDown, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLessons } from "@/hooks/use-lessons"
import { useCourses } from "@/hooks/use-courses"
import { Skeleton } from "@/components/ui/skeleton"

interface StudentDashboardProps {
  studentId: string
  studentName: string
  onBack: () => void
}

export default function StudentDashboard({ studentId, studentName, onBack }: StudentDashboardProps) {
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({})

  // Router for navigation
  const router = useRouter()

  // Fetch courses and lessons data with refetch capability
  const { courses, isLoading: coursesLoading } = useCourses()
  const { lessons, isLoading: lessonsLoading, refetch: refetchLessons } = useLessons()

  // Smart auto-refresh: only refresh lessons when in student view (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refetchLessons() // Only refetch lessons, not courses
    }, 30000) // Every 30 seconds - less aggressive than before
    
    return () => clearInterval(interval)
  }, [refetchLessons])

  // Toggle course expansion
  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }))
  }

  // Handle lesson selection
  const handleLessonSelect = (courseId: string, lessonId: string) => {
    // Navigate to the specific chat route
    router.push(`/student/${studentId}/chat/${lessonId}`)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Collapsible Sidebar with Courses and Lessons */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 border-r bg-muted/10 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-sm font-semibold">OT</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold">Oak Tree</h1>
                <p className="text-xs text-muted-foreground">Student: {studentName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {coursesLoading ? (
              // Loading skeleton for courses
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <div className="ml-4 space-y-1">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-8 w-1/2" />
                  </div>
                </div>
              ))
            ) : courses.length > 0 ? (
              courses.map((course) => {
                const isExpanded = expandedCourses[course.id]
                const courseLessons = lessons.filter(lesson => lesson.course_id === course.id)
                
                return (
                  <div key={course.id} className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-auto p-2"
                      onClick={() => toggleCourseExpansion(course.id)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <BookOpen className="h-4 w-4" />
                        <div className="text-left flex-1">
                          <div className="font-medium text-sm">{course.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {courseLessons.length} lesson{courseLessons.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </Button>
                    
                    {isExpanded && (
                      <div className="ml-6 space-y-1">
                        {lessonsLoading ? (
                          Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                          ))
                        ) : courseLessons.length > 0 ? (
                          courseLessons.map((lesson) => (
                            <Button
                              key={lesson.id}
                              variant="ghost"
                              className="w-full justify-start h-auto p-2"
                              onClick={() => handleLessonSelect(course.id, lesson.id)}
                            >
                              <div className="text-left">
                                <div className="font-medium text-sm">
                                  Week {lesson.week_number} - Lesson {lesson.lesson_number}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {lesson.topic}
                                </div>
                              </div>
                            </Button>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">
                            No lessons available
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center text-sm text-muted-foreground p-4">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No courses available yet</p>
                <p className="text-xs mt-1">Ask your teacher to create courses</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="h-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <header className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-2">
              {sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-sm font-medium text-muted-foreground">
                Select a lesson to start learning
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                Switch Student
              </Button>
            </div>
          </header>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">Welcome, {studentName}!</h2>
              <p className="text-muted-foreground mb-4">
                Select a lesson from the sidebar to start your learning session with Chirpy
              </p>
              <p className="text-sm text-muted-foreground">
                Click on any lesson to begin an interactive chat session
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 