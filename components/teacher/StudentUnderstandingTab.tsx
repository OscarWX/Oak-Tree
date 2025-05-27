"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, User, RefreshCw } from "lucide-react"
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
  const [understandingData, setUnderstandingData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchUnderstandingData()
  }, [lessonId])

  const fetchUnderstandingData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/student-understanding?lessonId=${lessonId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch understanding data')
      }
      const data = await response.json()
      setUnderstandingData(data)
    } catch (error) {
      console.error("Error fetching understanding data:", error)
      setUnderstandingData({ students: [], classAverage: 0, commonMisunderstandings: [], totalStudents: 0 })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchUnderstandingData()
    setIsRefreshing(false)
  }

  // Get understanding level text and color
  const getUnderstandingLevel = (score: number) => {
    if (providedGetUnderstandingLevel) {
      return providedGetUnderstandingLevel(score)
    }

    if (score >= 80) return { text: "Good", color: "text-green-600" }
    if (score >= 60) return { text: "Moderate", color: "text-yellow-600" }
    return { text: "Needs Review", color: "text-orange-600" }
  }

  // Use provided data or fetched data
  const displayData = understandingData || { students: [], classAverage: 0, commonMisunderstandings: [], totalStudents: 0 }
  const classAverage = providedClassAverage !== undefined ? providedClassAverage : displayData.classAverage
  const commonMisunderstandings = displayData.commonMisunderstandings
  const displayStudents = studentData || displayData.students

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{lessonTitle} Understanding</h2>
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

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent"></div>
        </div>
      ) : displayStudents.length > 0 ? (
        <>
          {/* Class Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Class Overview</CardTitle>
              <CardDescription>Based on {displayStudents.length} student understanding records</CardDescription>
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
                    {commonMisunderstandings.map((item: any, index: number) => (
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
            {displayStudents.map((student: any) => {
              const understanding = getUnderstandingLevel(student.understanding)
              
              return (
                <Card key={student.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{student.name}</CardTitle>
                          <CardDescription>Last active: {student.lastActive}</CardDescription>
                        </div>
                      </div>
                      <span className={understanding.color}>
                        {understanding.text} ({student.understanding}%)
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <Progress value={student.understanding} className="h-1.5" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {student.strengths && student.strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium text-green-600 mb-1">Strengths</h4>
                          <ul className="space-y-1">
                            {student.strengths.slice(0, 3).map((strength: string, i: number) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-green-600">•</span>
                                <span className="text-xs">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {student.misunderstandings && student.misunderstandings.length > 0 && (
                        <div>
                          <h4 className="font-medium text-orange-600 mb-1">Needs Help With</h4>
                          <ul className="space-y-1">
                            {student.misunderstandings.slice(0, 3).map((misunderstanding: string, i: number) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-orange-600">•</span>
                                <span className="text-xs">{misunderstanding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {student.concepts && student.concepts.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">
                          Concepts Covered ({student.concepts.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {student.concepts.slice(0, 5).map((concept: any, i: number) => (
                            <Badge 
                              key={i} 
                              variant="secondary" 
                              className={`text-xs ${concept.level <= 2 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}
                            >
                              {concept.concept}
                            </Badge>
                          ))}
                          {student.concepts.length > 5 && (
                            <span className="text-xs text-muted-foreground">+{student.concepts.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}
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
