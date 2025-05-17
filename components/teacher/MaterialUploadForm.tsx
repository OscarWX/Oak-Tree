"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MaterialUploadFormProps {
  lessonId: string
  onSuccess: (material: any) => void
}

export default function MaterialUploadForm({ lessonId, onSuccess }: MaterialUploadFormProps) {
  const [title, setTitle] = useState("")
  const [contentType, setContentType] = useState("text")
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    setError(null)

    try {
      // Validate inputs
      if (!title) {
        throw new Error("Please enter a title for the material")
      }

      if (contentType === "text" && !content.trim()) {
        throw new Error("Please enter content for the material")
      }

      if (contentType === "file" && !file) {
        throw new Error("Please select a file to upload")
      }

      console.log("Submitting material:", { 
        lessonId, 
        title, 
        contentType,
        content: contentType === "text" ? content : null,
        file: contentType === "file" ? file : null
      })

      const formData = new FormData()
      formData.append("lessonId", lessonId)
      formData.append("title", title)
      formData.append("contentType", contentType)

      if (contentType === "text") {
        formData.append("content", content)
      } else if (file) {
        formData.append("file", file)
      }

      const response = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      })

      // Safely parse response. If server returns HTML or plain text, avoid JSON parse error.
      let data: any
      const responseContentType = response.headers.get("content-type") || ""

      if (responseContentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        // Attempt to parse JSON if it looks like JSON, otherwise keep raw text
        try {
          data = JSON.parse(text)
        } catch {
          data = { error: text }
        }
      }

      console.log("Upload response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload material")
      }

      // Reset form
      setTitle("")
      setContent("")
      setFile(null)

      // Call success callback
      onSuccess(data.material)
    } catch (err: any) {
      console.error("Error uploading material:", err)
      setError(err.message || "An error occurred while uploading")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    console.log("File selected:", selectedFile)
    setFile(selectedFile)
    
    // Clear any previous errors when selecting a new file
    if (selectedFile) {
      setError(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Material Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for this material"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Content Type</Label>
        <RadioGroup value={contentType} onValueChange={setContentType} className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="text" id="text" />
            <Label htmlFor="text" className="cursor-pointer">
              Text Content
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="file" id="file" />
            <Label htmlFor="file" className="cursor-pointer">
              File Upload
            </Label>
          </div>
        </RadioGroup>
      </div>

      {contentType === "text" ? (
        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter the lesson content here..."
            className="min-h-[200px]"
            required={contentType === "text"}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="fileInput">Upload File</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center">
            <FileText className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-4">{file ? file.name : "PDF, DOCX, or TXT files up to 10MB"}</p>
            <Input
              id="fileInput"
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx,.txt"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isUploading}>
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Material
          </>
        )}
      </Button>
    </form>
  )
}
