"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, User, RefreshCw, Brain, CheckCircle, XCircle, Target, TrendingUp, Clock } from "lucide-react"

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

interface SessionData {
  id: string
  student_id: string
  lesson_id: string
  started_at: string
  ended_at: string | null
  status: string
  summary: string | null
  students: { id: string; name: string; email: string }
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
  completionPercentage: number
  sessionCompleted: boolean
}

export default function StudentUnderstandingTab({
  lessonId,
  lessonTitle,
}: StudentUnderstandingTabProps) {
  const [conceptData, setConceptData] = useState<ConceptTracking[]>([])
  const [sessionsData, setSessionsData] = useState<SessionData[]>([])
  const [allConcepts, setAllConcepts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedView, setSelectedView] = useState<'overview' | 'by-student'>('overview')

  useEffect(() => {
    fetchAllData()
    
    // Set up periodic refresh every 30 seconds to catch student resets
    const interval = setInterval(() => {
      fetchAllData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [lessonId])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      // Use the working teacher progress API instead of separate endpoints
      const teacherId = '00000000-0000-0000-0000-000000000001' // Default teacher ID
      const progressResponse = await fetch(`/api/teacher/progress?teacherId=${teacherId}&lessonId=${lessonId}`)
      
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        
        // Transform the data to match our interfaces
        const conceptTrackingData: ConceptTracking[] = []
        const sessionData: SessionData[] = []
        
        // Process the conceptProgress data from the working API
        progressData.conceptProgress.forEach((item: any) => {
          // Create session data
          const sessionExists = sessionData.find(s => s.student_id === item.student_id)
          if (!sessionExists) {
            sessionData.push({
              id: item.student_id, // Using student_id as session id for uniqueness
              student_id: item.student_id,
              lesson_id: item.lesson_id,
              started_at: new Date().toISOString(),
              ended_at: item.phase === 'completed' ? new Date().toISOString() : null,
              status: item.phase === 'completed' ? 'completed' : 'active',
              summary: JSON.stringify({
                questions: Array(item.totalConcepts || 1).fill({}),
                currentQuestionIndex: item.conceptsCompleted || 0,
                currentPhase: item.phase === 'completed' ? 'completed' : 'example'
              }),
              students: {
                id: item.student_id,
                name: item.students.name,
                email: item.students.email
              }
            })
          }
          
          // Create concept tracking data for each concept (not just when there are wrong answers)
          const conceptName = item.concept && item.concept !== 'Overall Progress' ? item.concept : `Concept ${conceptTrackingData.length + 1}`
          
          conceptTrackingData.push({
            id: `${item.student_id}-${conceptName}`,
            student_id: item.student_id,
            lesson_id: item.lesson_id,
            concept: conceptName,
            wrong_multiple_choice_count: item.wrongAnswersCount || 0,
            wrong_example_count: 0,
            total_wrong_count: item.wrongAnswersCount || 0,
            understanding_level: item.wrongAnswersCount === 0 ? 'good' : 
                               item.wrongAnswersCount <= 2 ? 'moderate' : 'bad',
            last_updated: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
        })

        setConceptData(conceptTrackingData)
        setSessionsData(sessionData)
        
        // Set all concepts based on what we found
        const allUniqueConcepts = [...new Set(conceptTrackingData.map(item => item.concept))]
        setAllConcepts(allUniqueConcepts.length > 0 ? allUniqueConcepts : ['Overall Progress'])
        
      } else {
        console.error('Failed to fetch progress data')
        setConceptData([])
        setSessionsData([])
        setAllConcepts([])
      }
      
    } catch (error) {
      console.error("Error fetching data:", error)
      setConceptData([])
      setSessionsData([])
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

    // Initialize from sessions data (students who have actually started)
    sessionsData.forEach(session => {
      if (!studentMap.has(session.student_id)) {
        // Handle different possible data structures for student info
        let studentInfo
        if (session.students) {
          // If students is an object with name/email directly
          if (typeof session.students === 'object' && 'name' in session.students) {
            studentInfo = {
              id: session.student_id,
              name: (session.students as any).name || 'Unknown Student',
              email: (session.students as any).email || 'No email'
            }
          } 
          // If students is an array, take the first one
          else if (Array.isArray(session.students) && (session.students as any).length > 0) {
            studentInfo = {
              id: session.student_id,
              name: (session.students as any)[0]?.name || 'Unknown Student',
              email: (session.students as any)[0]?.email || 'No email'
            }
          }
          else {
            studentInfo = {
              id: session.student_id,
              name: 'Unknown Student',
              email: 'No email'
            }
          }
        } else {
          studentInfo = {
            id: session.student_id,
            name: 'Unknown Student',
            email: 'No email'
          }
        }

        // Get actual total concepts from session questions, not lesson key_concepts
        let totalConcepts = allConcepts.length
        if (session.summary) {
          try {
            const sessionState = JSON.parse(session.summary)
            if (sessionState.questions && sessionState.questions.length > 0) {
              totalConcepts = sessionState.questions.length
            }
          } catch (e) {
            console.error("Error parsing session state for concept count:", e)
          }
        }

        studentMap.set(session.student_id, {
          student: studentInfo,
          concepts: [],
          totalConcepts: totalConcepts,
          completedConcepts: 0,
          goodConcepts: 0,
          moderateConcepts: 0,
          badConcepts: 0,
          averageWrongCount: 0,
          lastActivity: 'No activity',
          completionPercentage: 0,
          sessionCompleted: false
        })
      }
      
      const studentProgress = studentMap.get(session.student_id)!
      
      // Calculate completion based on session status and summary
      if (session.status === 'completed' && session.ended_at) {
        studentProgress.sessionCompleted = true
        studentProgress.completionPercentage = 100
        studentProgress.completedConcepts = studentProgress.totalConcepts
      } else if (session.summary) {
        try {
          const sessionState = JSON.parse(session.summary)
          if (sessionState.questions && sessionState.currentQuestionIndex !== undefined) {
            const total = sessionState.questions.length
            const current = sessionState.currentQuestionIndex
            const completed = sessionState.currentPhase === 'example' ? current : Math.max(0, current)
            studentProgress.completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0
            studentProgress.completedConcepts = completed
          }
        } catch (e) {
          console.error("Error parsing session state:", e)
        }
      }
      
      // Set last activity
      const activityDate = new Date(session.ended_at || session.started_at)
      studentProgress.lastActivity = activityDate.toLocaleDateString()
    })

    // Add concept tracking data and calculate wrong answers from multiple choice attempts
    conceptData.forEach(tracking => {
      if (studentMap.has(tracking.student_id)) {
        const studentProgress = studentMap.get(tracking.student_id)!
        studentProgress.concepts.push(tracking)
        
        // Count by understanding level based on wrong answers
        const wrongCount = tracking.total_wrong_count
        let understandingLevel: 'good' | 'moderate' | 'bad'
        
        if (wrongCount === 0) {
          understandingLevel = 'good'
        } else if (wrongCount <= 2) {
          understandingLevel = 'moderate'  
        } else {
          understandingLevel = 'bad'
        }
        
        // Update the tracking object with calculated understanding
        tracking.understanding_level = understandingLevel
        
        // Count by understanding level
        if (understandingLevel === 'good') studentProgress.goodConcepts++
        else if (understandingLevel === 'moderate') studentProgress.moderateConcepts++
        else if (understandingLevel === 'bad') studentProgress.badConcepts++
        
        // Calculate average wrong count - this is the total wrong answers for this student
        const totalWrong = studentProgress.concepts.reduce((sum, c) => sum + c.total_wrong_count, 0)
        studentProgress.averageWrongCount = totalWrong // Change this to total instead of average
        
        // Update last activity if tracking is more recent
        const trackingDate = new Date(tracking.last_updated)
        const currentDate = studentProgress.lastActivity === 'No activity' ? new Date(0) : new Date(studentProgress.lastActivity)
        if (trackingDate > currentDate) {
          studentProgress.lastActivity = trackingDate.toLocaleDateString()
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

  const studentProgress = processStudentProgress()
  
  // Debug logging to see the actual data structure
  useEffect(() => {
    if (studentProgress.length > 0) {
      console.log("Student progress data structure:", studentProgress[0])
    }
  }, [studentProgress])

  // Calculate class-level statistics
  const classStats = {
    totalStudents: studentProgress.length,
    activeStudents: studentProgress.filter(s => s.completionPercentage > 0).length,
    averageCompletionRate: studentProgress.length > 0 
      ? Math.round(studentProgress.reduce((sum, s) => sum + s.completionPercentage, 0) / studentProgress.length)
      : 0,
    totalWrongAnswers: studentProgress.reduce((sum, s) => sum + s.averageWrongCount, 0),
    averageUnderstandingDistribution: {
      good: conceptData.filter(c => {
        const wrongCount = c.total_wrong_count
        return wrongCount === 0
      }).length,
      moderate: conceptData.filter(c => {
        const wrongCount = c.total_wrong_count
        return wrongCount > 0 && wrongCount <= 2
      }).length,
      bad: conceptData.filter(c => {
        const wrongCount = c.total_wrong_count
        return wrongCount > 2
      }).length
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{lessonTitle || 'Student Understanding'}</h2>
          <p className="text-muted-foreground">Track student progress and understanding levels</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
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
          <CardContent className="p-6">
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Wrong Answers</p>
                <p className="text-2xl font-bold">{classStats.totalWrongAnswers}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold">{classStats.activeStudents}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Understanding Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Distribution</CardTitle>
          <CardDescription>How students are performing across all concepts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">
                {classStats.averageUnderstandingDistribution.good}
              </div>
              <div className="text-sm text-muted-foreground">Good Understanding</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-600 mb-2">
                {classStats.averageUnderstandingDistribution.moderate}
              </div>
              <div className="text-sm text-muted-foreground">Moderate Understanding</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">
                {classStats.averageUnderstandingDistribution.bad}
              </div>
              <div className="text-sm text-muted-foreground">Need Help</div>
            </div>
        </div>
        </CardContent>
      </Card>

      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-student">By Student</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                          {student.completedConcepts}/{student.totalConcepts} concepts • {student.averageWrongCount} wrong answers
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{student.completionPercentage}% Complete</div>
                        <div className="text-xs text-muted-foreground">
                          {student.sessionCompleted ? 'Session completed' : `${student.averageWrongCount} wrong answers total`}
                        </div>
                </div>
                      <Progress value={student.completionPercentage} className="w-20" />
              </div>
                  </div>
                ))}
                {studentProgress.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No student activity yet for this lesson.
                </div>
              )}
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
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="h-5 w-5" />
                        </div>
                        <div>
                        <CardTitle className="text-lg">{student.student.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Last active: {student.lastActivity}</p>
                      </div>
                    </div>
                    {student.sessionCompleted && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    </div>
                  </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{student.completionPercentage}%</span>
                    </div>
                    <Progress value={student.completionPercentage} className="h-2" />
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
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Concepts</h4>
                      <div className="space-y-1">
                        {student.concepts.map((concept) => (
                          <div key={concept.id} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1">{concept.concept}</span>
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
                  </CardContent>
                </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
