"use client"

import { Button } from "@/components/ui/button"
import { X, CheckCircle, Circle } from "lucide-react"

interface ProgressPanelProps {
  onClose: () => void
  lessonWeek: number
  lessonNumber: number
  progress: number
}

export default function ProgressPanel({ onClose, lessonWeek, lessonNumber, progress }: ProgressPanelProps) {
  // Sample learning objectives
  const learningObjectives = [
    { id: 1, text: "Identify the major organelles of a cell", completed: true },
    { id: 2, text: "Explain the function of the mitochondria", completed: true },
    { id: 3, text: "Describe the structure of the cell membrane", completed: true },
    { id: 4, text: "Compare and contrast plant and animal cells", completed: false },
    { id: 5, text: "Explain how cells communicate with each other", completed: false },
  ]

  // Calculate completion percentage
  const completedCount = learningObjectives.filter((obj) => obj.completed).length
  const completionPercent = Math.round((completedCount / learningObjectives.length) * 100)

  return (
    <div className="w-80 border-l absolute right-0 top-0 bottom-0 bg-background z-10 flex flex-col">
      <div className="h-14 border-b px-4 flex items-center justify-between">
        <h2 className="font-medium">Learning Progress</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-1">
            Week {lessonWeek} - Lesson {lessonNumber}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Your current progress: {progress}% complete</p>

          {/* Visual progress bar */}
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Learning Objectives</h3>
          <div className="space-y-3">
            {learningObjectives.map((objective) => (
              <div key={objective.id} className="flex items-start gap-2">
                {objective.completed ? (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{objective.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Topics Mastered</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm">Cell Structure Terminology</span>
              <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full text-primary">100%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Organelle Functions</span>
              <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full text-primary">83%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Cell Communication</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">42%</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Suggested Next Steps</h3>
          <div className="space-y-2">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">Review plant cell structure differences</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">Practice drawing and labeling cell diagrams</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
