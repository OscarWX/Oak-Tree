import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

interface ConceptUnderstanding {
  id: string
  student_id: string
  lesson_id: string
  concept: string
  wrong_multiple_choice_count: number
  wrong_example_count: number
  total_wrong_count: number
  understanding_level: 'good' | 'moderate' | 'bad'
  last_updated: string
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')
    const studentId = searchParams.get('studentId')

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    // Get actual multiple choice attempts for this lesson
    let attemptsQuery = supabaseAdmin
      .from('multiple_choice_attempts')
      .select('*')
      .eq('lesson_id', lessonId)

    // Filter by student if provided
    if (studentId) {
      attemptsQuery = attemptsQuery.eq('student_id', studentId)
    }

    const { data: attempts, error: attemptsError } = await attemptsQuery

    if (attemptsError) {
      console.error("Error fetching attempts data:", attemptsError)
      return NextResponse.json({ error: "Failed to fetch attempts data" }, { status: 500 })
    }

    // Calculate understanding levels from actual attempt data
    const conceptMap = new Map<string, {
      student_id: string
      lesson_id: string
      concept: string
      wrong_multiple_choice_count: number
      wrong_example_count: number
      total_wrong_count: number
      understanding_level: 'good' | 'moderate' | 'bad'
      last_updated: string
    }>()

    attempts?.forEach((attempt: any) => {
      const key = `${attempt.student_id}-${attempt.concept}`
      
      if (!conceptMap.has(key)) {
        conceptMap.set(key, {
          student_id: attempt.student_id,
          lesson_id: attempt.lesson_id,
          concept: attempt.concept,
          wrong_multiple_choice_count: 0,
          wrong_example_count: 0,
          total_wrong_count: 0,
          understanding_level: 'good' as 'good' | 'moderate' | 'bad',
          last_updated: attempt.created_at
        })
      }

      const conceptData = conceptMap.get(key)!
      
      if (!attempt.is_correct) {
        conceptData.wrong_multiple_choice_count++
        conceptData.total_wrong_count++
      }

      // Update last_updated to the latest attempt
      if (attempt.created_at > conceptData.last_updated) {
        conceptData.last_updated = attempt.created_at
      }
    })

    // Calculate understanding levels
    const conceptUnderstanding: ConceptUnderstanding[] = Array.from(conceptMap.values()).map(concept => {
      // Calculate understanding level based on total wrong count
      let understanding_level: 'good' | 'moderate' | 'bad'
      if (concept.total_wrong_count <= 1) {
        understanding_level = 'good'
      } else if (concept.total_wrong_count <= 3) {
        understanding_level = 'moderate'
      } else {
        understanding_level = 'bad'
      }

      return {
        id: `${concept.student_id}-${concept.concept}`, // Generate synthetic ID
        student_id: concept.student_id,
        lesson_id: concept.lesson_id,
        concept: concept.concept,
        wrong_multiple_choice_count: concept.wrong_multiple_choice_count,
        wrong_example_count: concept.wrong_example_count,
        total_wrong_count: concept.total_wrong_count,
        understanding_level: understanding_level,
        last_updated: concept.last_updated,
        created_at: concept.last_updated
      }
    })

    return NextResponse.json({ 
      data: conceptUnderstanding,
      message: "Concept understanding calculated from actual student attempts"
    })
  } catch (error: any) {
    console.error("Error in concept understanding endpoint:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 