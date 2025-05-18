"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Sparkles, Loader2 } from "lucide-react"
import LessonMaterialsTab from "./teacher/LessonMaterialsTab"
import StudentUnderstandingTab from "./teacher/StudentUnderstandingTab"

interface TeacherLessonViewProps {
  lesson: any
}

export default function TeacherLessonView({ lesson: initialLesson }: TeacherLessonViewProps) {
  const [activeTab, setActiveTab] = useState("materials")
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [lesson, setLesson] = useState(initialLesson)

  const generateLessonSummary = async () => {
    setIsGeneratingSummary(true)
    setSummaryError(null)
    
    try {
      const response = await fetch(`/api/lessons/${lesson.id}/summarize`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate lesson summary")
      }

      if (data.lesson) {
        // Update the lesson state with new data
        setLesson({
          ...lesson,
          ai_summary: data.lesson.ai_summary,
          key_concepts: data.lesson.key_concepts
        });
        
        // Force component re-render
        setActiveTab("overview");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Error generating lesson summary:", error)
      setSummaryError(error.message || "Failed to generate summary")
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const lessonTitle = `Week ${lesson.week_number} - Lesson ${lesson.lesson_number}: ${lesson.topic}`

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{lessonTitle}</h1>
        <p className="text-muted-foreground">Manage materials and track student understanding</p>
      </div>

      <Tabs defaultValue="materials" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="overview">Lesson Overview</TabsTrigger>
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
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <LessonMaterialsTab lessonId={lesson.id} lessonTitle={lessonTitle} />
        </TabsContent>

        <TabsContent value="understanding">
          <StudentUnderstandingTab lessonId={lesson.id} lessonTitle={lessonTitle} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
