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

  // State for selected student and course
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState("")
  
  // State to track expanded courses in the sidebar
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({})

  // Fetch all courses for the student
  const { courses, isLoading: coursesLoading } = useCourses()
  
  // Fetch lessons for selected course
  const { lessons, isLoading: lessonsLoading } = useLessons(selectedCourseId || undefined)

  // State for showing/hiding sidebar and notes
  const [showSidebar, setShowSidebar] = useState(true)
  // const [showNotes, setShowNotes] = useState(false)

  // Find active lesson
  const activeLesson = lessons.find((lesson) => lesson.id === selectedLessonId) || null
  
  // Find active course
  const activeCourse = courses.find((course) => course.id === selectedCourseId) || null

  // Initialize first course as expanded if no course is expanded yet
  useEffect(() => {
    if (courses.length > 0 && Object.keys(expandedCourses).length === 0) {
      // Initialize the first course as expanded
      setExpandedCourses({ [courses[0].id]: true });
    }
  }, [courses, expandedCourses]);

  // Fetch student name when student ID changes
  useEffect(() => {
    if (selectedStudentId) {
      // Fetch student details
      fetch(`/api/students/${selectedStudentId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.student) {
            setStudentName(data.student.name)
          }
        })
        .catch((error) => {
          console.error("Error fetching student:", error)
        })
    }
  }, [selectedStudentId])

  // Handle role selection
  const handleRoleSelect = (role: "student" | "teacher") => {
    if (role === "student") {
      setCurrentView("studentSelection")
    } else {
      setCurrentView("teacher")
    }
  }

  // Handle student selection
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)

    // Fetch courses for this student and set the first one as active
    fetch(`/api/courses?studentId=${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.courses && data.courses.length > 0) {
          setSelectedCourseId(data.courses[0].id)
          setCurrentView("student")
        } else {
          console.error("No courses found for student")
        }
      })
      .catch((error) => {
        console.error("Error fetching courses:", error)
      })
  }

  // Handle course selection
  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId)
    
    // Toggle whether this course is expanded in the sidebar
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }))
  }

  // Handle lesson selection
  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId)

    // Hide notes panel when changing lessons
    // setShowNotes(false)

    // Auto-hide sidebar on mobile
    if (window.innerWidth < 768) {
      setShowSidebar(false)
    }
  }

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
      <div
        className={`${showSidebar ? "w-64" : "w-0"} border-r bg-muted/10 transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Tree className="h-6 w-6 text-green-600" />
            <span className="font-semibold">OakTree</span>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-64px)]">
          <div className="space-y-4 p-4">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">My Courses</h3>
            </div>

            {/* Course List with Expandable Lessons */}
            <nav className="space-y-2">
              {/* Loading State */}
              {coursesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <div className="pl-6 space-y-1">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ) : courses.length === 0 ? (
                /* No Courses State */
                <div className="text-center p-4 text-sm text-muted-foreground">
                  No courses available
                </div>
              ) : (
                /* Courses with Lessons */
                courses.map(course => {
                  // Check if this course is expanded
                  const isExpanded = expandedCourses[course.id] || false;
                  // Check if this is the active course
                  const isActive = selectedCourseId === course.id;
                  
                  return (
                    <div key={course.id} className="space-y-1">
                      {/* Course Button */}
                      <Button 
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-between"
                        onClick={() => handleCourseSelect(course.id)}
                      >
                        <div className="flex items-center">
                          <BookOpen className="mr-2 h-4 w-4" />
                          <span className="text-sm font-medium truncate">
                            {course.title}
                          </span>
                        </div>
                        {/* Chevron indicator for expanded state */}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Lessons for this Course (only shown when expanded) */}
                      {isExpanded && (
                        <div className="pl-6 space-y-1">
                          {/* If this is the active course, show its lessons */}
                          {isActive && lessonsLoading ? (
                            /* Loading lessons state */
                            <>
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                            </>
                          ) : isActive && lessons.length === 0 ? (
                            /* No lessons state */
                            <div className="text-xs text-muted-foreground px-2 py-1">
                              No lessons available
                            </div>
                          ) : isActive ? (
                            /* Lessons list */
                            lessons.map(lesson => (
                              <Button
                                key={lesson.id}
                                variant={lesson.id === selectedLessonId ? "secondary" : "ghost"}
                                size="sm"
                                className="w-full justify-start text-sm h-8"
                                onClick={() => handleLessonSelect(lesson.id)}
                              >
                                {/* Lesson display format */}
                                Week {lesson.week_number} - Lesson {lesson.lesson_number}
                              </Button>
                            ))
                          ) : (
                            /* If this isn't the active course, show loading indicator */
                            <div className="text-xs text-muted-foreground px-2 py-1">
                              Select course to view lessons
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </nav>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        <div className="flex-1 flex flex-col">
          {/* Minimal Header */}
          <header className="h-12 border-b px-4 flex items-center justify-between">
            <div className="flex items-center">
              {!showSidebar && (
                <Button variant="ghost" size="icon" className="mr-2 h-8 w-8" onClick={() => setShowSidebar(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              {showSidebar && (
                <Button variant="ghost" size="icon" className="mr-2 h-8 w-8" onClick={() => setShowSidebar(false)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div>
                {activeLesson && activeCourse ? (
                  <>
                    <h1 className="text-sm font-medium">{activeCourse.title}</h1>
                    <p className="text-xs text-muted-foreground">
                      Week {activeLesson.week_number} - Lesson {activeLesson.lesson_number}: {activeLesson.topic}
                    </p>
                  </>
                ) : lessonsLoading || coursesLoading ? (
                  <>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No lesson selected</p>
                )}
              </div>
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
