"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Users, GraduationCap } from 'lucide-react'
import StudentProgressDashboard from '@/components/teacher/StudentProgressDashboard'

// Mock teacher ID - in a real app, this would come from authentication
const TEACHER_ID = "teacher-123"

interface Course {
  id: string
  title: string
  description: string
}

interface Lesson {
  id: string
  title: string
  topic: string
  course_id: string
}

export default function TeacherProgressPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [selectedLesson, setSelectedLesson] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse)
    } else {
      setLessons([])
      setSelectedLesson("")
    }
  }, [selectedCourse])

  const fetchCourses = async () => {
    try {
      // In a real app, this would be an API call to get teacher's courses
      // For now, we'll use mock data
      const mockCourses = [
        { id: "course-1", title: "Mathematics 101", description: "Basic mathematics concepts" },
        { id: "course-2", title: "Algebra Fundamentals", description: "Introduction to algebra" },
        { id: "course-3", title: "Geometry Basics", description: "Basic geometry principles" }
      ]
      setCourses(mockCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLessons = async (courseId: string) => {
    try {
      // In a real app, this would be an API call to get course lessons
      // For now, we'll use mock data
      const mockLessons = [
        { id: "lesson-1", title: "Addition and Subtraction", topic: "Basic Arithmetic", course_id: courseId },
        { id: "lesson-2", title: "Multiplication Tables", topic: "Multiplication", course_id: courseId },
        { id: "lesson-3", title: "Division Concepts", topic: "Division", course_id: courseId }
      ]
      setLessons(mockLessons)
    } catch (error) {
      console.error('Error fetching lessons:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Progress Dashboard</h1>
          <p className="text-muted-foreground">Monitor your students' learning progress and understanding</p>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Filter by Course and Lesson
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Lesson</label>
              <Select 
                value={selectedLesson} 
                onValueChange={setSelectedLesson}
                disabled={!selectedCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lesson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Lessons</SelectItem>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedCourse("")
                setSelectedLesson("")
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Dashboard */}
      <StudentProgressDashboard 
        teacherId={TEACHER_ID}
        courseId={selectedCourse || undefined}
        lessonId={selectedLesson || undefined}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Lessons</p>
                <p className="text-2xl font-bold">{selectedCourse ? lessons.length : "Select Course"}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monitoring</p>
                <p className="text-2xl font-bold">Real-time</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 