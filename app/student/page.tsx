"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import StudentSelection from "@/components/student-selection"
import StudentDashboard from "@/components/student-dashboard"

export default function StudentPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string>("")
  const router = useRouter()

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    // Fetch student name
    fetch(`/api/students/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.student) {
          setStudentName(data.student.name)
        }
      })
      .catch((error) => {
        console.error("Error fetching student:", error)
      })
  }

  const handleBack = () => {
    if (selectedStudentId) {
      // If we're in the dashboard, go back to student selection
      setSelectedStudentId(null)
      setStudentName("")
    } else {
      // If we're in student selection, go back to home
      router.push("/")
    }
  }

  if (!selectedStudentId) {
    return <StudentSelection onStudentSelect={handleStudentSelect} onBack={handleBack} />
  }

  return (
    <StudentDashboard 
      studentId={selectedStudentId} 
      studentName={studentName}
      onBack={handleBack}
    />
  )
} 