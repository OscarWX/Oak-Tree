"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookOpen, ChevronLeft, FileText, Menu, TreesIcon as Tree, ChevronDown, ChevronRight } from "lucide-react"
import ChatInterface from "../chat-interface"
import NotesPanel from "../components/notes-panel"
import LandingPage from "../components/landing-page"
import TeacherDashboard from "../components/teacher-dashboard"
import StudentSelection from "../components/student-selection"
import { useLessons } from "@/hooks/use-lessons"
import { useCourses } from "@/hooks/use-courses"
import { Skeleton } from "@/components/ui/skeleton"

// Define app views
type AppView = "landing" | "studentSelection" | "student" | "teacher"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // State for current view
  const [currentView, setCurrentView] = useState<AppView>("landing")
  
  // State for selected student, course and lesson
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string>("")
  
  // Sidebar and notes state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({})
  const [showNotes, setShowNotes] = useState(false)

  // Fetch courses and lessons data with refetch capability
  const { courses, isLoading: coursesLoading, refetch: refetchCourses } = useCourses()
  // Fetch lessons for all courses (remove the courseId filter)
  const { lessons, isLoading: lessonsLoading, refetch: refetchLessons } = useLessons()

  // Smart auto-refresh: only refresh lessons when in student view (every 30 seconds)
  useEffect(() => {
    if (currentView === "student") {
      const interval = setInterval(() => {
        refetchLessons() // Only refetch lessons, not courses
      }, 30000) // Every 30 seconds - less aggressive than before
      
      return () => clearInterval(interval)
    }
  }, [currentView, refetchLessons])

  // Toggle course expansion
  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }))
  }

  // Handle role selection
  const handleRoleSelect = (role: "student" | "teacher") => {
    if (role === "teacher") {
      setCurrentView("teacher")
    } else {
      setCurrentView("studentSelection")
    }
  }

  // Handle student selection
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    // Fetch student name
    fetch(`/api/students/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.student) {
          setStudentName(data.student.name)
        }
      })
      .catch((error) => {
        console.error("Error fetching student:", error)
      })
    setCurrentView("student")
  }

  // Handle lesson selection
  const handleLessonSelect = (courseId: string, lessonId: string) => {
    setSelectedCourseId(courseId)
    setSelectedLessonId(lessonId)
    
    // Auto-expand the selected course
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: true
    }))
  }

  // Get the active lesson details
  const activeLesson = lessons.find(lesson => lesson.id === selectedLessonId)

  // Return to landing page
  const returnToLanding = () => {
    setCurrentView("landing")
    setSelectedStudentId(null)
    setSelectedCourseId(null)
    setSelectedLessonId(null)
  }

  // Return to student selection
  const returnToStudentSelection = () => {
    setCurrentView("studentSelection")
  }

  // Render appropriate view based on current state
  if (currentView === "landing") {
    return <LandingPage onRoleSelect={handleRoleSelect} />
  }

  if (currentView === "studentSelection") {
    return <StudentSelection onStudentSelect={handleStudentSelect} onBack={returnToLanding} />
  }

  if (currentView === "teacher") {
    return <TeacherDashboard onBack={returnToLanding} />
  }

  // Student view (chat interface)
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
                              variant={selectedLessonId === lesson.id ? "secondary" : "ghost"}
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
                {activeLesson ? (
                  `${activeLesson.topic} - Week ${activeLesson.week_number}, Lesson ${activeLesson.lesson_number}`
                ) : (
                  "Select a lesson to start learning"
                )}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Removed Notes button since we've integrated pre-class reading in the chat interface */}
              {/* 
              <Button
                variant={showNotes ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1"
                disabled={!activeLesson}
              >
                <FileText className="h-3.5 w-3.5" />
                {showNotes ? "Hide Notes" : "View Notes"}
              </Button>
              */}
              <Button variant="ghost" size="sm" onClick={returnToStudentSelection}>
                Switch Student
              </Button>
            </div>
          </header>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Interface */}
          {selectedStudentId && selectedLessonId ? (
            <ChatInterface studentId={selectedStudentId} studentName={studentName} lessonId={selectedLessonId} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <h2 className="text-xl font-semibold mb-2">No Lesson Selected</h2>
                <p className="text-muted-foreground mb-4">
                  Please select a lesson from the sidebar to start your learning session
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notes Panel (conditionally rendered) - removed since we've integrated pre-class reading in chat */}
        {/* 
        {showNotes && activeLesson && (
          <div className="w-80 border-l bg-muted/10 h-[calc(100vh-48px)]">
            <NotesPanel
              onClose={() => setShowNotes(false)}
              lessonWeek={activeLesson.week_number}
              lessonNumber={activeLesson.lesson_number}
              lessonTopic={activeLesson.topic}
            />
          </div>
        )}
        */}
      </div>
    </div>
  )
}

