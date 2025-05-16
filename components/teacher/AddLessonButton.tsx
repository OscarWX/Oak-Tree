"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface AddLessonButtonProps {
  courseId: string
  onLessonAdded: () => void
}

export default function AddLessonButton({ courseId, onLessonAdded }: AddLessonButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [weekNumber, setWeekNumber] = useState("")
  const [lessonNumber, setLessonNumber] = useState("")
  const [topic, setTopic] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate inputs
      if (!title || !weekNumber || !lessonNumber || !topic) {
        throw new Error("Please fill in all fields")
      }

      // Parse numbers and validate they are positive integers
      const weekNum = parseInt(weekNumber, 10)
      const lessonNum = parseInt(lessonNumber, 10)
      
      if (isNaN(weekNum) || weekNum <= 0) {
        throw new Error("Week number must be a positive number")
      }
      
      if (isNaN(lessonNum) || lessonNum <= 0) {
        throw new Error("Lesson number must be a positive number")
      }

      const payload = {
        courseId,
        title,
        weekNumber: weekNum,
        lessonNumber: lessonNum,
        topic,
      }
      
      console.log("Submitting lesson:", payload)

      // Create lesson via API
      const response = await fetch("/api/lessons/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log("API response:", data)

      if (!response.ok) {
        // If we have detailed error information, display it
        if (data.details) {
          console.error("Detailed error:", data.details)
        }
        throw new Error(data.error || "Failed to create lesson")
      }

      // Show success message
      toast({
        title: "Lesson created",
        description: "Your new lesson has been created successfully.",
        open: true,
      })

      // Reset form and close dialog
      resetForm()
      setOpen(false)

      // Refresh lessons list
      onLessonAdded()
    } catch (error: any) {
      console.error("Error in form submission:", error)
      toast({
        title: "Error creating lesson",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
        open: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setWeekNumber("")
    setLessonNumber("")
    setTopic("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4" />
          Add Lesson
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
            <DialogDescription>Create a new lesson for your course. Fill in the details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Lesson Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter lesson title"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="weekNumber">Week Number</Label>
                <Input
                  id="weekNumber"
                  type="number"
                  min="1"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                  placeholder="1"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lessonNumber">Lesson Number</Label>
                <Input
                  id="lessonNumber"
                  type="number"
                  min="1"
                  value={lessonNumber}
                  onChange={(e) => setLessonNumber(e.target.value)}
                  placeholder="1"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic">Topic</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter the main topic of this lesson"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Lesson"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
