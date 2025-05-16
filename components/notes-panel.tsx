"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface NotesPanelProps {
  onClose: () => void
  lessonWeek: number
  lessonNumber: number
  lessonTopic: string
}

export default function NotesPanel({ onClose, lessonWeek, lessonNumber, lessonTopic }: NotesPanelProps) {
  return (
    <div className="w-72 border-l absolute right-0 top-0 bottom-0 bg-background z-10 flex flex-col">
      <div className="h-12 border-b px-4 flex items-center justify-between">
        <h2 className="font-medium text-sm">Lesson Notes</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-1">
            Week {lessonWeek} - Lesson {lessonNumber}: {lessonTopic}
          </h3>
          <p className="text-xs text-muted-foreground">Prof. Johnson</p>
        </div>

        {/* PDF Placeholder */}
        <div className="flex-1 border rounded-md flex flex-col">
          {/* PDF Toolbar */}
          <div className="bg-muted/50 p-2 border-b flex items-center justify-between">
            <div className="text-xs font-medium">
              Lecture_Notes_W{lessonWeek}_L{lessonNumber}.pdf
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              Download
            </Button>
          </div>

          {/* PDF Content Placeholder */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
            <div className="w-full aspect-[8.5/11] bg-white shadow-md mb-4 p-6 flex flex-col">
              <div className="h-6 w-1/2 bg-muted mb-4"></div>
              <div className="h-2 w-full bg-muted mb-2"></div>
              <div className="h-2 w-full bg-muted mb-2"></div>
              <div className="h-2 w-3/4 bg-muted mb-4"></div>

              <div className="h-4 w-1/3 bg-muted mb-2"></div>
              <div className="h-2 w-full bg-muted mb-1"></div>
              <div className="h-2 w-full bg-muted mb-1"></div>
              <div className="h-2 w-full bg-muted mb-1"></div>
              <div className="h-2 w-4/5 bg-muted mb-4"></div>

              <div className="h-12 w-full bg-muted mb-4"></div>

              <div className="h-4 w-1/3 bg-muted mb-2"></div>
              <div className="h-2 w-full bg-muted mb-1"></div>
              <div className="h-2 w-full bg-muted mb-1"></div>
              <div className="h-2 w-5/6 bg-muted mb-1"></div>
            </div>
            <div className="text-xs text-muted-foreground">Page 1 of 3</div>
          </div>
        </div>
      </div>
    </div>
  )
}
