"use client"

import { useRouter } from "next/navigation"
import TeacherDashboard from "@/components/teacher-dashboard"

export default function TeacherPage() {
  const router = useRouter()

  const handleBack = () => {
    router.push("/")
  }

  return <TeacherDashboard onBack={handleBack} />
} 