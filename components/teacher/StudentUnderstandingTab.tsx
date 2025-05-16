"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, User } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface StudentUnderstandingTabProps {
  lessonId: string
  lessonTitle: string
  students?: any[]
  studentData?: any[]
  classAverage?: number
  getUnderstandingLevel?: (score: number) => { text: string; color: string }
}

export default function StudentUnderstandingTab({
  lessonId,
  lessonTitle,
  students,
  studentData,
  classAverage: providedClassAverage,
  getUnderstandingLevel: providedGetUnderstandingLevel,
}: StudentUnderstandingTabProps) {
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchSessions()
  }, [lessonId])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      // Get all chat sessions for this lesson
      const { data: sessionData, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("started_at", { ascending: false })

      if (sessionError) throw sessionError

      // Get student information for all sessions
      if (sessionData && sessionData.length > 0) {
        const studentIds = [...new Set(sessionData.map((session) => session.student_id))]

        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, name")
          .in("id", studentIds)

        if (studentError) throw studentError

        // Create a lookup object for student data
        const studentLookup: Record<string, any> = {}
        studentData?.forEach((student) => {
          studentLookup[student.id] = student
        })

        setStudentsMap(studentLookup)
      }

      setSessions(sessionData || [])
    } catch (error) {
      console.error("Error fetching sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get understanding level text and color
  const getUnderstandingLevel = (score: number) => {
    if (providedGetUnderstandingLevel) {
      return providedGetUnderstandingLevel(score)
    }

    if (score >= 80) return { text: "Good", color: "text-green-600" }
    if (score >= 60) return { text: "Moderate", color: "text-yellow-600" }
    return { text: "Needs Help", color: "text-orange-600" }
  }

  // Calculate class average understanding
  const calculateClassAverage = () => {
    if (providedClassAverage !== undefined) {
      return providedClassAverage
    }

    if (sessions.length === 0) return 0
    const sessionsWithScores = sessions.filter((s) => s.understanding_level !== null)
    if (sessionsWithScores.length === 0) return 0

    const total = sessionsWithScores.reduce((sum, session) => sum + (session.understanding_level || 0), 0)
    return Math.round(total / sessionsWithScores.length)
  }

  // Find common misunderstandings across all students
  const findCommonMisunderstandings = () => {
    const misunderstandingCounts: Record<string, number> = {}

    sessions.forEach((session) => {
      if (session.misunderstandings && Array.isArray(session.misunderstandings)) {
        session.misunderstandings.forEach((misunderstanding: string) => {
          misunderstandingCounts[misunderstanding] = (misunderstandingCounts[misunderstanding] || 0) + 1
        })
      }
    })

    // Sort by frequency
    return Object.entries(misunderstandingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([concept, count]) => ({ concept, count }))
  }

  const classAverage = calculateClassAverage()
  const commonMisunderstandings = findCommonMisunderstandings()

  // Use provided data or fetched data
  const displaySessions = studentData || sessions

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{lessonTitle} Understanding</h2>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent"></div>
        </div>
      ) : displaySessions.length > 0 ? (
        <>
          {/* Class Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Class Overview</CardTitle>
              <CardDescription>Based on {displaySessions.length} student chat sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Average Understanding</span>
                  <span className={getUnderstandingLevel(classAverage).color}>{classAverage}%</span>
                </div>
                <Progress value={classAverage} className="h-2" />
              </div>

              {commonMisunderstandings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-orange-600">Common Misunderstandings</h4>
                  <div className="flex flex-wrap gap-2">
                    {commonMisunderstandings.map((item, index) => (
                      <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {item.concept} ({item.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Student Cards */}
          <h3 className="text-lg font-medium mt-6 mb-3">Individual Students</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displaySessions.map((session) => {
              // For provided data
              if (studentData) {
                const understanding = getUnderstandingLevel(session.understanding)
                return (
                  <Card key={session.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            {session.avatar}
                          </div>
                          <div>
                            <CardTitle className="text-base">{session.name}</CardTitle>
                            <CardDescription>Last active: {session.lastActive}</CardDescription>
                          </div>
                        </div>
                        <span className={understanding.color}>
                          {understanding.text} ({session.understanding}%)
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">
                        <Progress value={session.understanding} className="h-1.5" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {session.strengths && session.strengths.length > 0 && (
                          <div>
                            <h4 className="font-medium text-green-600 mb-1">Strengths</h4>
                            <ul className="space-y-1">
                              {session.strengths.slice(0, 3).map((strength: string, i: number) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-green-600">•</span>
                                  <span className="text-xs">{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {session.misunderstandings && session.misunderstandings.length > 0 && (
                          <div>
                            <h4 className="font-medium text-orange-600 mb-1">Needs Help With</h4>
                            <ul className="space-y-1">
                              {session.misunderstandings.slice(0, 3).map((misunderstanding: string, i: number) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-orange-600">•</span>
                                  <span className="text-xs">{misunderstanding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              // For fetched data
              const student = studentsMap[session.student_id]
              const understanding = session.understanding_level
                ? getUnderstandingLevel(session.understanding_level)
                : { text: "Not Evaluated", color: "text-muted-foreground" }

              return (
                <Card key={session.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{student?.name || "Unknown Student"}</CardTitle>
                          <CardDescription>{new Date(session.started_at).toLocaleDateString()}</CardDescription>
                        </div>
                      </div>
                      <span className={understanding.color}>
                        {understanding.text} {session.understanding_level ? `(${session.understanding_level}%)` : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {session.understanding_level && (
                      <div className="mb-3">
                        <Progress value={session.understanding_level} className="h-1.5" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {session.strengths && session.strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium text-green-600 mb-1">Strengths</h4>
                          <ul className="space-y-1">
                            {session.strengths.slice(0, 3).map((strength: string, i: number) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-green-600">•</span>
                                <span className="text-xs">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {session.misunderstandings && session.misunderstandings.length > 0 && (
                        <div>
                          <h4 className="font-medium text-orange-600 mb-1">Needs Help With</h4>
                          <ul className="space-y-1">
                            {session.misunderstandings.slice(0, 3).map((misunderstanding: string, i: number) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-orange-600">•</span>
                                <span className="text-xs">{misunderstanding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Data Available</h3>
            <p className="text-sm text-muted-foreground text-center">
              Students haven't completed any chat sessions for this lesson yet
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
