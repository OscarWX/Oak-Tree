"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GraduationCap, BookOpen, TreesIcon as Tree } from "lucide-react"

export default function LandingPage() {
  const [hoveredRole, setHoveredRole] = useState<"student" | "teacher" | null>(null)
  const router = useRouter()

  const handleRoleSelect = (role: "student" | "teacher") => {
    if (role === "teacher") {
      router.push("/teacher")
    } else {
      router.push("/student")
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <div className="flex items-center gap-2">
            <Tree className="h-8 w-8 text-green-600" />
            <span className="font-bold text-xl">OakTree</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to OakTree</h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Your AI-powered learning companion for personalized study sessions
          </p>
        </div>

        <h2 className="text-2xl font-semibold mb-8">I am a...</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          {/* Student Card */}
          <div
            className={`border rounded-xl overflow-hidden transition-all duration-300 ${
              hoveredRole === "student" ? "shadow-lg scale-105" : "shadow"
            }`}
            onMouseEnter={() => setHoveredRole("student")}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className="p-6 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Student</h3>
              <p className="text-center text-muted-foreground mb-6">
                Review your lessons with an AI study buddy that adapts to your learning style
              </p>
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleRoleSelect("student")}
              >
                Continue as Student
              </Button>
            </div>
          </div>

          {/* Teacher Card */}
          <div
            className={`border rounded-xl overflow-hidden transition-all duration-300 ${
              hoveredRole === "teacher" ? "shadow-lg scale-105" : "shadow"
            }`}
            onMouseEnter={() => setHoveredRole("teacher")}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className="p-6 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <GraduationCap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Teacher</h3>
              <p className="text-center text-muted-foreground mb-6">
                Create and manage lessons, track student progress, and provide personalized feedback
              </p>
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleRoleSelect("teacher")}
              >
                Continue as Teacher
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; 2025 OakTree. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
