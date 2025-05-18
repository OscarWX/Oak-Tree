"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, BookOpen, Sparkles, Loader2, ArrowRight } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import LessonMaterialsTab from "@/components/teacher/LessonMaterialsTab"
import StudentUnderstandingTab from "@/components/teacher/StudentUnderstandingTab"
import { supabase } from "@/lib/supabase"
import type { Lesson } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.id as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingPreclass, setIsGeneratingPreclass] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [preclassError, setPreclassError] = useState<string | null>(null)
  const [teacherNeed, setTeacherNeed] = useState("")

  useEffect(() => {
    fetchLessonDetails()
  }, [lessonId])

  const fetchLessonDetails = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("lessons").select("*, courses(*)").eq("id", lessonId).single()

      if (error) throw error
      setLesson(data)
      if (data.teacher_need) {
        setTeacherNeed(data.teacher_need)
      }
    } catch (error) {
      console.error("Error fetching lesson:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateLessonSummary = async () => {
    setIsGeneratingSummary(true)
    setSummaryError(null)
    
    try {
      const response = await fetch(`/api/lessons/${lessonId}/summarize`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate lesson summary")
      }

      if (data.lesson) {
        // Update the lesson state with the new summary
        setLesson(data.lesson)
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error: any) {
      console.error("Error generating lesson summary:", error)
      setSummaryError(error.message || "Failed to generate summary")
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const generatePreclassReading = async () => {
    setIsGeneratingPreclass(true)
    setPreclassError(null)
    
    try {
      if (!lesson?.ai_summary) {
        throw new Error("Please generate a lesson overview first before creating pre-class reading.")
      }
      
      const response = await fetch(`/api/lessons/${lessonId}/preclassreading`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherNeed: teacherNeed.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate pre-class reading")
      }

      if (data.lesson) {
        // Update the lesson state with new data
        setLesson(data.lesson)
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error: any) {
      console.error("Error generating pre-class reading:", error)
      setPreclassError(error.message || "Failed to generate pre-class reading")
    } finally {
      setIsGeneratingPreclass(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
        <Button asChild>
          <Link href="/teacher/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  const lessonTitle = `Week ${lesson.week_number} - Lesson ${lesson.lesson_number}: ${lesson.topic}`
  const needsOverviewFirst = !lesson.ai_summary

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link href="/teacher/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{lessonTitle}</h1>
            <p className="text-muted-foreground">{(lesson as any).courses?.title}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="overview">Lesson Overview</TabsTrigger>
          <TabsTrigger value="preclass">Pre-class Reading</TabsTrigger>
          <TabsTrigger value="understanding">Student Understanding</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Lesson Overview</CardTitle>
                  <CardDescription>AI-generated summary of all materials in this lesson</CardDescription>
                </div>
                <Button 
                  onClick={generateLessonSummary} 
                  disabled={isGeneratingSummary}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {lesson.ai_summary ? "Regenerate Summary" : "Generate Summary"}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {summaryError && (
                <div className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                  {summaryError}
                </div>
              )}
              
              {lesson.ai_summary ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Summary</h3>
                    <div className="text-sm text-muted-foreground">
                      {lesson.ai_summary?.split('\n').map((paragraph: string, i: number) => (
                        <p key={i} className="mb-4">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                  
                  {lesson.key_concepts && lesson.key_concepts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Key Concepts</h3>
                      <div className="space-y-3">
                        {lesson.key_concepts.map((concept: any, index: number) => (
                          <div key={index} className="border-l-2 border-green-600 pl-3 py-1">
                            <h4 className="text-sm font-semibold text-green-700">{concept.concept}</h4>
                            {concept.description && (
                              <p className="text-sm text-muted-foreground">{concept.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Summary Available</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Generate an AI summary of all materials in this lesson to help students understand the big picture.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Make sure you have added materials to this lesson first.
                  </p>
                </div>
              )}
            </CardContent>
            {lesson.ai_summary && (
              <CardFooter>
                <Button 
                  onClick={() => {
                    const tabsElement = document.querySelector('[value="preclass"]')
                    if (tabsElement) {
                      (tabsElement as HTMLElement).click()
                    }
                  }}
                  className="ml-auto"
                >
                  Create Pre-class Reading <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="preclass">
          {needsOverviewFirst ? (
            <Card>
              <CardHeader>
                <CardTitle>Create Lesson Overview First</CardTitle>
                <CardDescription>
                  You need to generate a lesson overview first before creating pre-class reading.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Lesson Overview Required</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    The pre-class reading is generated based on your lesson overview and key concepts.
                  </p>
                  <Button 
                    onClick={() => {
                      const tabsElement = document.querySelector('[value="overview"]')
                      if (tabsElement) {
                        (tabsElement as HTMLElement).click()
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Go to Lesson Overview <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : lesson.preclass_reading ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Pre-class Reading</CardTitle>
                    <CardDescription>Student-friendly reading material for before class</CardDescription>
                  </div>
                  <Button 
                    onClick={generatePreclassReading} 
                    disabled={isGeneratingPreclass}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isGeneratingPreclass ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Regenerate Reading
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {preclassError && (
                  <div className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                    {preclassError}
                  </div>
                )}
                
                <div>
                  <Label htmlFor="teacherNeed">Areas to Emphasize (Optional)</Label>
                  <Textarea
                    id="teacherNeed"
                    placeholder="Add specific concepts or aspects you want to emphasize in the pre-class reading..."
                    value={teacherNeed}
                    onChange={(e) => setTeacherNeed(e.target.value)}
                    className="mt-2 mb-4"
                  />
                </div>
                
                <div className="bg-gray-50 p-6 rounded-md border">
                  <h3 className="text-lg font-medium mb-3">Student Pre-class Reading</h3>
                  <div className="text-sm text-muted-foreground prose prose-green max-w-none">
                    {lesson.preclass_reading?.split('\n').map((paragraph: string, i: number) => (
                      <p key={i} className="mb-4">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Pre-class Reading</CardTitle>
                <CardDescription>
                  Generate student-friendly reading based on your lesson overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {preclassError && (
                  <div className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                    {preclassError}
                  </div>
                )}
                
                <div>
                  <Label htmlFor="teacherNeed">Areas to Emphasize (Optional)</Label>
                  <Textarea
                    id="teacherNeed"
                    placeholder="Add specific concepts or aspects you want to emphasize in the pre-class reading..."
                    value={teacherNeed}
                    onChange={(e) => setTeacherNeed(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Specify any concepts or aspects you want to particularly emphasize in the pre-class reading.
                  </p>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={generatePreclassReading} 
                    disabled={isGeneratingPreclass}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isGeneratingPreclass ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Pre-class Reading
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="materials">
          <LessonMaterialsTab lessonId={lessonId} lessonTitle={lessonTitle} />
        </TabsContent>

        <TabsContent value="understanding">
          <StudentUnderstandingTab lessonId={lessonId} lessonTitle={lessonTitle} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
