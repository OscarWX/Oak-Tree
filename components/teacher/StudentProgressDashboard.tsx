"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  MessageCircle,
  Trophy,
  Brain
} from 'lucide-react'
import { cn } from "@/lib/utils"

interface StudentProgressDashboardProps {
  teacherId: string
  courseId?: string
  lessonId?: string
}

interface ConceptProgress {
  student_id: string
  lesson_id: string
  concept: string
  phase: string
  attempts: number
  completed_at: string
  understanding_level: number
  lesson_topic: string
  students: { name: string; email: string }
  lessons: { title: string; topic: string }
}

interface SessionStats {
  id: string
  student_id: string
  lesson_id: string
  started_at: string
  ended_at: string | null
  understanding_level: number
  students: { name: string }
  lessons: { title: string; topic: string }
}

interface ProgressData {
  conceptProgress: ConceptProgress[]
  sessionStats: SessionStats[]
  summary: {
    totalSessions: number
    completedSessions: number
    averageUnderstanding: string
  }
}

export default function StudentProgressDashboard({ 
  teacherId, 
  courseId, 
  lessonId 
}: StudentProgressDashboardProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [detailedProgress, setDetailedProgress] = useState<any>(null)

  useEffect(() => {
    fetchProgressData()
  }, [teacherId, courseId, lessonId])

  const fetchProgressData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ teacherId })
      if (courseId) params.append('courseId', courseId)
      if (lessonId) params.append('lessonId', lessonId)

      const response = await fetch(`/api/teacher/progress?${params}`)
      const data = await response.json()

      if (response.ok) {
        setProgressData(data)
      } else {
        console.error('Failed to fetch progress data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDetailedProgress = async (studentId: string, lessonId: string) => {
    try {
      const response = await fetch('/api/teacher/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, studentId, lessonId })
      })
      
      const data = await response.json()
      if (response.ok) {
        setDetailedProgress(data)
        setSelectedStudent(studentId)
      }
    } catch (error) {
      console.error('Error fetching detailed progress:', error)
    }
  }

  const getUnderstandingBadge = (level: number) => {
    const configs = {
      1: { label: "Not Started", color: "bg-gray-100 text-gray-800", icon: Clock },
      2: { label: "Struggling", color: "bg-red-100 text-red-800", icon: XCircle },
      3: { label: "Partial", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      4: { label: "Good", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
      5: { label: "Excellent", color: "bg-green-100 text-green-800", icon: Trophy }
    }
    
    const config = configs[level as keyof typeof configs] || configs[1]
    const Icon = config.icon
    
    return (
      <Badge className={cn("flex items-center gap-1", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getProgressPercentage = (phase: string) => {
    switch (phase) {
      case 'multiple_choice': return 50
      case 'example': return 75
      case 'completed': return 100
      default: return 0
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  if (!progressData) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No progress data available</p>
      </div>
    )
  }

  // Group progress by student
  const studentProgress = progressData.conceptProgress.reduce((acc, progress) => {
    const studentId = progress.student_id
    if (!acc[studentId]) {
      acc[studentId] = {
        student: progress.students,
        concepts: [],
        totalConcepts: 0,
        completedConcepts: 0,
        averageLevel: 0
      }
    }
    
    acc[studentId].concepts.push(progress)
    acc[studentId].totalConcepts++
    if (progress.phase === 'completed') {
      acc[studentId].completedConcepts++
    }
    
    return acc
  }, {} as Record<string, any>)

  // Calculate average understanding for each student
  Object.keys(studentProgress).forEach(studentId => {
    const concepts = studentProgress[studentId].concepts
    const avgLevel = concepts.length > 0 
      ? concepts.reduce((sum: number, c: ConceptProgress) => sum + c.understanding_level, 0) / concepts.length
      : 0
    studentProgress[studentId].averageLevel = avgLevel
  })

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{progressData.summary.totalSessions}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{progressData.summary.completedSessions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {progressData.summary.totalSessions > 0 
                    ? Math.round((progressData.summary.completedSessions / progressData.summary.totalSessions) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Understanding</p>
                <p className="text-2xl font-bold">{progressData.summary.averageUnderstanding}/5</p>
              </div>
              <Brain className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Progress</TabsTrigger>
          <TabsTrigger value="concepts">By Concept</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(studentProgress).map(([studentId, data]) => (
                  <div key={studentId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{data.student.name}</h3>
                      <p className="text-sm text-muted-foreground">{data.student.email}</p>
                      <div className="mt-2 flex items-center gap-4">
                        <span className="text-sm">
                          {data.completedConcepts}/{data.totalConcepts} concepts completed
                        </span>
                        <Progress 
                          value={(data.completedConcepts / data.totalConcepts) * 100} 
                          className="w-32" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getUnderstandingBadge(Math.round(data.averageLevel))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDetailedProgress(studentId, data.concepts[0]?.lesson_id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {detailedProgress ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Chat History & Understanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Understanding levels by concept */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detailedProgress.understanding.map((concept: any) => (
                      <div key={concept.concept} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{concept.concept}</h4>
                          {getUnderstandingBadge(concept.level)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Last updated: {new Date(concept.noted_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Chat messages summary */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Recent Activity</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {detailedProgress.chatHistory.slice(-10).map((message: any) => {
                        const content = typeof message.content === 'string' 
                          ? message.content 
                          : JSON.parse(message.content).message || 'System message'
                        
                        return (
                          <div key={message.id} className="flex items-start gap-2 p-2 text-sm">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              message.sender_type === 'student' 
                                ? "bg-green-100 text-green-800"
                                : message.sender_type === 'sage'
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            )}>
                              {message.sender_type === 'student' ? 'Student' : 
                               message.sender_type === 'sage' ? 'Sage' : 'Chirpy'}
                            </span>
                            <span className="flex-1">{content.substring(0, 100)}...</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Select a student to view detailed progress</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="concepts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Progress by Concept
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Group by concept */}
                {Object.entries(
                  progressData.conceptProgress.reduce((acc, progress) => {
                    if (!acc[progress.concept]) {
                      acc[progress.concept] = []
                    }
                    acc[progress.concept].push(progress)
                    return acc
                  }, {} as Record<string, ConceptProgress[]>)
                ).map(([concept, students]) => (
                  <div key={concept} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">{concept}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {students.map((student) => (
                        <div key={`${student.student_id}-${concept}`} className="flex items-center justify-between p-3 bg-muted rounded">
                          <div>
                            <p className="font-medium text-sm">{student.students.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.attempts} attempt{student.attempts !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={getProgressPercentage(student.phase)} 
                              className="w-16 h-2" 
                            />
                            {getUnderstandingBadge(student.understanding_level)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 