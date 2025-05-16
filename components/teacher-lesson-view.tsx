"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LessonMaterialsTab from "./teacher/LessonMaterialsTab"
import StudentUnderstandingTab from "./teacher/StudentUnderstandingTab"

interface TeacherLessonViewProps {
  lesson: any
}

export default function TeacherLessonView({ lesson }: TeacherLessonViewProps) {
  const [activeTab, setActiveTab] = useState("materials")

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
          <TabsTrigger value="understanding">Student Understanding</TabsTrigger>
        </TabsList>

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
