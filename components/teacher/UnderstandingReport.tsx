"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface UnderstandingReportProps {
  session: any
  studentName: string
}

export default function UnderstandingReport({ session, studentName }: UnderstandingReportProps) {
  if (!session) return null

  // Get understanding level text and color
  const getUnderstandingLevel = (score: number) => {
    if (score >= 80) return { text: "Good", color: "text-green-600" }
    if (score >= 60) return { text: "Moderate", color: "text-yellow-600" }
    return { text: "Needs Help", color: "text-orange-600" }
  }

  const understanding = getUnderstandingLevel(session.understanding_level)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>{studentName}'s Understanding</span>
            <span className={understanding.color}>
              {understanding.text} ({session.understanding_level}%)
            </span>
          </CardTitle>
          <CardDescription>
            Based on chat session from {new Date(session.started_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Understanding Level</span>
              <span>{session.understanding_level}%</span>
            </div>
            <Progress value={session.understanding_level} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-green-600">Strengths</h4>
              {session.strengths && session.strengths.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {session.strengths.map((strength: string, index: number) => (
                    <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {strength}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No specific strengths identified</p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 text-orange-600">Needs Improvement</h4>
              {session.misunderstandings && session.misunderstandings.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {session.misunderstandings.map((misunderstanding: string, index: number) => (
                    <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {misunderstanding}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No specific misunderstandings identified</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Summary</h4>
            <p className="text-sm">{session.summary}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
