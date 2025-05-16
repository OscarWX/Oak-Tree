"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface AddCourseDialogProps {
  onCourseAdded: () => void
}

export default function AddCourseDialog({ onCourseAdded }: AddCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate inputs
      if (!title) {
        throw new Error("Please enter a course title")
      }

      console.log("Submitting course:", { title, description })

      // Create course via API
      const response = await fetch("/api/courses/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
        }),
      })

      const data = await response.json()
      console.log("API response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to create course")
      }

      // Show success message
      toast({
        title: "Course created",
        description: "Your new course has been created successfully.",
      })

      // Reset form and close dialog
      resetForm()
      setOpen(false)

      // Refresh courses list
      onCourseAdded()
    } catch (error: any) {
      console.error("Error in form submission:", error)
      toast({
        title: "Error creating course",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4" />
          Create New Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>Add a new course to your teaching portfolio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to Biology"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a brief description of the course"
                rows={3}
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
                "Create Course"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
