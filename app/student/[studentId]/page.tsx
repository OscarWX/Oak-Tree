"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import StudentDashboard from "@/components/student-dashboard"

export default function StudentPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId as string
  const [studentName, setStudentName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (studentId) {
      fetchStudentData()
    }
  }, [studentId])

  const fetchStudentData = async () => {
    try {
      const response = await fetch(`/api/students/${studentId}`)
      const data = await response.json()
      
      if (response.ok && data.student) {
        setStudentName(data.student.name)
      } else {
        setError("Student not found")
      }
    } catch (error) {
      console.error("Error fetching student:", error)
      setError("Failed to load student data")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/student")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-green-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Student Selection
          </button>
        </div>
      </div>
    )
  }

  return (
    <StudentDashboard 
      studentId={studentId} 
      studentName={studentName}
      onBack={handleBack}
    />
  )
} 