"use client"

import { Button } from "@/components/ui/button"
import { X, Star } from "lucide-react"

interface FeedbackPanelProps {
  onClose: () => void
  lessonWeek: number
  lessonNumber: number
}

export default function FeedbackPanel({ onClose, lessonWeek, lessonNumber }: FeedbackPanelProps) {
  return (
    <div className="w-80 border-l absolute right-0 top-0 bottom-0 bg-background z-10 flex flex-col">
      <div className="h-14 border-b px-4 flex items-center justify-between">
        <h2 className="font-medium">Teacher Feedback</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-1">
            Week {lessonWeek} - Lesson {lessonNumber}
          </h3>
          <p className="text-xs text-muted-foreground">Last updated: Yesterday by Prof. Johnson</p>
        </div>

        <div className="space-y-4">
          {/* Overall feedback */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Overall Performance</h4>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= 4 ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm">
              You've demonstrated a solid understanding of cell structure fundamentals. Your explanation of
              mitochondrial function was particularly strong. Continue to work on comparing plant and animal cells.
            </p>
          </div>

          {/* Concept mastery */}
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium mb-2">Concept Mastery</h4>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Cell Structure Terminology</span>
                  <span className="text-sm font-medium text-green-600">Excellent</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: "95%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Organelle Functions</span>
                  <span className="text-sm font-medium text-green-600">Good</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: "80%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Cell Comparisons</span>
                  <span className="text-sm font-medium text-amber-600">Developing</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Specific comments */}
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium mb-2">Teacher Comments</h4>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Strengths:</span> You're able to clearly explain complex functions like
                ATP production. Your use of specific terminology is very good.
              </p>
              <p className="text-sm">
                <span className="font-medium">Areas for growth:</span> Work on understanding the structural differences
                between plant and animal cells. Try creating comparison charts to help visualize the differences.
              </p>
            </div>
          </div>

          {/* Next steps */}
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium mb-2">Recommended Focus</h4>
            <ul className="text-sm space-y-1 list-disc pl-4">
              <li>Review plant cell specific organelles (cell wall, chloroplasts)</li>
              <li>Practice drawing and labeling both cell types</li>
              <li>Prepare to discuss cell transport mechanisms in the next lesson</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
