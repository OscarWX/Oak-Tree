"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, User, RefreshCw, Brain, CheckCircle, XCircle, Target, TrendingUp, Clock, BookOpen } from "lucide-react"

interface StudentUnderstandingTabProps {
  lessonId: string
  lessonTitle: string
  students?: any[]
  studentData?: any[]
  classAverage?: number
  getUnderstandingLevel?: (score: number) => { text: string; color: string }
}

interface ConceptTracking {
  id: string
  student_id: string
  lesson_id: string
  concept: string
  wrong_multiple_choice_count: number
  wrong_example_count: number
  total_wrong_count: number
  understanding_level: 'good' | 'moderate' | 'bad'
  last_updated: string
  created_at: string
}

interface StudentProgress {
  student: { id: string; name: string; email: string }
  concepts: ConceptTracking[]
  totalConcepts: number
  completedConcepts: number
  goodConcepts: number
  moderateConcepts: number
  badConcepts: number
  averageWrongCount: number
  lastActivity: string
}

export default function StudentUnderstandingTab({
  lessonId,
  lessonTitle,
}: StudentUnderstandingTabProps) {
  const [conceptData, setConceptData] = useState<ConceptTracking[]>([])
  const [studentsData, setStudentsData] = useState<any[]>([])
  const [allConcepts, setAllConcepts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedView, setSelectedView] = useState<'overview' | 'by-student' | 'by-concept'>('overview')

  useEffect(() => {
    fetchAllData()
  }, [lessonId])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      // Fetch concept tracking data
      const conceptResponse = await fetch(`/api/concept-understanding?lessonId=${lessonId}`)
      if (!conceptResponse.ok) throw new Error('Failed to fetch concept data')
      const conceptResult = await conceptResponse.json()
      
      // Fetch students who have interacted with this lesson
      const studentsResponse = await fetch(`/api/students?lessonId=${lessonId}`)
      let students = []
      if (studentsResponse.ok) {
        const studentsResult = await studentsResponse.json()
        students = studentsResult.students || []
      }

      // Get lesson data to extract concepts
      const lessonResponse = await fetch(`/api/lessons/${lessonId}`)
      let lessonConcepts = []
      if (lessonResponse.ok) {
        const lessonResult = await lessonResponse.json()
        lessonConcepts = lessonResult.lesson?.key_concepts || []
      }

      setConceptData(conceptResult.data || [])
      setStudentsData(students)
      
      // Get all unique concepts from both tracking data and lesson
      const trackingConcepts = [...new Set(conceptResult.data?.map((item: ConceptTracking) => item.concept) || [])]
      const allUniqueConcepts = [...new Set([...trackingConcepts, ...lessonConcepts])]
      setAllConcepts(allUniqueConcepts)
      
    } catch (error) {
      console.error("Error fetching data:", error)
      setConceptData([])
      setStudentsData([])
      setAllConcepts([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAllData()
    setIsRefreshing(false)
  }

  // Process student progress data
  const processStudentProgress = (): StudentProgress[] => {
    const studentMap = new Map<string, StudentProgress>()

    // Initialize all students who have interacted
    studentsData.forEach(student => {
      studentMap.set(student.id, {
        student: student,
        concepts: [],
        totalConcepts: allConcepts.length,
        completedConcepts: 0,
        goodConcepts: 0,
        moderateConcepts: 0,
        badConcepts: 0,
        averageWrongCount: 0,
        lastActivity: 'No activity'
      })
    })

    // Add concept tracking data
    conceptData.forEach(tracking => {
      if (studentMap.has(tracking.student_id)) {
        const studentProgress = studentMap.get(tracking.student_id)!
        studentProgress.concepts.push(tracking)
        
        // Count by understanding level
        if (tracking.understanding_level === 'good') studentProgress.goodConcepts++
        else if (tracking.understanding_level === 'moderate') studentProgress.moderateConcepts++
        else if (tracking.understanding_level === 'bad') studentProgress.badConcepts++
        
        studentProgress.completedConcepts = studentProgress.concepts.length
        
        // Calculate average wrong count
        const totalWrong = studentProgress.concepts.reduce((sum, c) => sum + c.total_wrong_count, 0)
        studentProgress.averageWrongCount = studentProgress.concepts.length > 0 
          ? Math.round((totalWrong / studentProgress.concepts.length) * 10) / 10 
          : 0
        
        // Update last activity
        const lastUpdate = new Date(tracking.last_updated)
        if (studentProgress.lastActivity === 'No activity' || new Date(studentProgress.lastActivity) < lastUpdate) {
          studentProgress.lastActivity = lastUpdate.toLocaleDateString()
        }
      }
    })

    return Array.from(studentMap.values())
  }

  const getUnderstandingBadge = (level: 'good' | 'moderate' | 'bad') => {
    const configs = {
      good: { label: "Good", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      moderate: { label: "Moderate", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertCircle },
      bad: { label: "Needs Help", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle }
    }
    
    const config = configs[level]
    const Icon = config.icon
    
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const processConceptAnalytics = () => {
    const conceptMap = new Map<string, {
      concept: string
      totalStudents: number
      studentsAttempted: number
      avgWrongCount: number
      levelDistribution: { good: number; moderate: number; bad: number }
    }>()

    allConcepts.forEach(concept => {
      conceptMap.set(concept, {
        concept,
        totalStudents: studentsData.length,
        studentsAttempted: 0,
        avgWrongCount: 0,
        levelDistribution: { good: 0, moderate: 0, bad: 0 }
      })
    })

    conceptData.forEach(tracking => {
      const analytics = conceptMap.get(tracking.concept)
      if (analytics) {
        analytics.studentsAttempted++
        analytics.avgWrongCount += tracking.total_wrong_count
        analytics.levelDistribution[tracking.understanding_level]++
      }
    })

    // Calculate averages
    conceptMap.forEach(analytics => {
      if (analytics.studentsAttempted > 0) {
        analytics.avgWrongCount = Math.round((analytics.avgWrongCount / analytics.studentsAttempted) * 10) / 10
      }
    })

    return Array.from(conceptMap.values())
  }

  const studentProgress = processStudentProgress()
  const conceptAnalytics = processConceptAnalytics()
  
  // Calculate class-level statistics
  const classStats = {
    totalStudents: studentsData.length,
    studentsWithData: studentProgress.filter(s => s.concepts.length > 0).length,
    averageCompletionRate: studentProgress.length > 0 
      ? Math.round(studentProgress.reduce((sum, s) => sum + getProgressPercentage(s.completedConcepts, s.totalConcepts), 0) / studentProgress.length)
      : 0,
    totalConceptsTracked: conceptData.length,
    averageUnderstandingDistribution: {
      good: conceptData.filter(c => c.understanding_level === 'good').length,
      moderate: conceptData.filter(c => c.understanding_level === 'moderate').length,
      bad: conceptData.filter(c => c.understanding_level === 'bad').length
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{lessonTitle} - Concept Understanding</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Class Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{classStats.totalStudents}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-bold">{classStats.averageCompletionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concepts Tracked</p>
                <p className="text-2xl font-bold">{classStats.totalConceptsTracked}</p>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold">{classStats.studentsWithData}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-student">By Student</TabsTrigger>
          <TabsTrigger value="by-concept">By Concept</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Understanding Distribution</CardTitle>
              <CardDescription>How students are performing across all concepts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{classStats.averageUnderstandingDistribution.good}</div>
                  <div className="text-sm text-muted-foreground">Good Understanding</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{classStats.averageUnderstandingDistribution.moderate}</div>
                  <div className="text-sm text-muted-foreground">Moderate Understanding</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{classStats.averageUnderstandingDistribution.bad}</div>
                  <div className="text-sm text-muted-foreground">Need Help</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Student Overview</CardTitle>
              <CardDescription>Summary of all students' progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {studentProgress.map((student) => (
                  <div key={student.student.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{student.student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.completedConcepts}/{student.totalConcepts} concepts • Last active: {student.lastActivity}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{getProgressPercentage(student.completedConcepts, student.totalConcepts)}% Complete</div>
                        <div className="text-xs text-muted-foreground">Avg: {student.averageWrongCount} wrong answers</div>
                      </div>
                      <Progress value={getProgressPercentage(student.completedConcepts, student.totalConcepts)} className="w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-student" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {studentProgress.map((student) => (
              <Card key={student.student.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{student.student.name}</CardTitle>
                        <CardDescription>{student.student.email}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {student.completedConcepts}/{student.totalConcepts} concepts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{getProgressPercentage(student.completedConcepts, student.totalConcepts)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(student.completedConcepts, student.totalConcepts)} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-medium text-green-600">{student.goodConcepts}</div>
                      <div className="text-xs text-muted-foreground">Good</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-yellow-600">{student.moderateConcepts}</div>
                      <div className="text-xs text-muted-foreground">Moderate</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-red-600">{student.badConcepts}</div>
                      <div className="text-xs text-muted-foreground">Need Help</div>
                    </div>
                  </div>

                  {student.concepts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Concept Details</h4>
                      <div className="space-y-2">
                        {student.concepts.map((concept) => (
                          <div key={concept.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{concept.concept}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {concept.total_wrong_count} wrong
                              </span>
                              {getUnderstandingBadge(concept.understanding_level)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {student.concepts.length === 0 && (
                    <div className="text-center py-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No concept data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="by-concept" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {conceptAnalytics.map((concept) => (
              <Card key={concept.concept}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg">{concept.concept}</CardTitle>
                    </div>
                    <Badge variant="outline">
                      {concept.studentsAttempted}/{concept.totalStudents} students
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Participation Rate</span>
                      <span>{getProgressPercentage(concept.studentsAttempted, concept.totalStudents)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(concept.studentsAttempted, concept.totalStudents)} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-medium text-green-600">{concept.levelDistribution.good}</div>
                      <div className="text-xs text-muted-foreground">Good</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-yellow-600">{concept.levelDistribution.moderate}</div>
                      <div className="text-xs text-muted-foreground">Moderate</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-red-600">{concept.levelDistribution.bad}</div>
                      <div className="text-xs text-muted-foreground">Need Help</div>
                    </div>
                  </div>

                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-medium">{concept.avgWrongCount}</div>
                    <div className="text-xs text-muted-foreground">Average wrong answers</div>
                  </div>

                  {concept.studentsAttempted === 0 && (
                    <div className="text-center py-4">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No students have attempted this concept yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
