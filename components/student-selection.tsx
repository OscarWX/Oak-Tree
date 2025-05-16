"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { TreesIcon as Tree } from "lucide-react"
import { useStudents } from "@/hooks/use-students"
import { Skeleton } from "@/components/ui/skeleton"

interface StudentSelectionProps {
  onStudentSelect: (studentId: string) => void
  onBack: () => void
}

export default function StudentSelection({ onStudentSelect, onBack }: StudentSelectionProps) {
  const { students, isLoading, error } = useStudents()

  const getStudentAvatar = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const getStudentLevel = (index: number) => {
    const levels = ["Freshman", "Sophomore", "Junior", "Senior"]
    return levels[index % levels.length]
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tree className="h-8 w-8 text-green-600" />
            <span className="font-bold text-xl">OakTree</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold mb-4">Select a Student</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose a student profile to continue to your personalized learning experience
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-xl overflow-hidden shadow">
                <div className="p-6 flex flex-col items-center">
                  <Skeleton className="h-16 w-16 rounded-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-1" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
            {students.map((student, index) => (
              <div
                key={student.id}
                className="border rounded-xl overflow-hidden shadow hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => onStudentSelect(student.id)}
              >
                <div className="p-6 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4 text-xl font-bold text-green-600">
                    {getStudentAvatar(student.name)}
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{student.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{getStudentLevel(index)}</p>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => onStudentSelect(student.id)}
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
