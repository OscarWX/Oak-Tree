/**
 * Utility functions for tracking and managing concept understanding
 */

export interface ConceptUnderstanding {
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

export type AnswerType = 'multiple_choice' | 'example'

/**
 * Track a wrong answer for a specific concept
 */
export async function trackConceptUnderstanding(
  studentId: string,
  lessonId: string,
  concept: string,
  answerType: AnswerType,
  isCorrect: boolean
): Promise<ConceptUnderstanding | null> {
  try {
    const response = await fetch('/api/concept-understanding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId,
        lessonId,
        concept,
        answerType,
        isCorrect,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to track concept understanding')
    }

    return result.data || null
  } catch (error) {
    console.error('Error tracking concept understanding:', error)
    return null
  }
}

/**
 * Get concept understanding data for a student/lesson/concept
 */
export async function getConceptUnderstanding(
  studentId?: string,
  lessonId?: string,
  concept?: string
): Promise<ConceptUnderstanding[]> {
  try {
    const params = new URLSearchParams()
    if (studentId) params.append('studentId', studentId)
    if (lessonId) params.append('lessonId', lessonId)
    if (concept) params.append('concept', concept)

    const response = await fetch(`/api/concept-understanding?${params.toString()}`)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch concept understanding')
    }

    return result.data || []
  } catch (error) {
    console.error('Error fetching concept understanding:', error)
    return []
  }
}

/**
 * Calculate understanding level based on wrong answer counts
 */
export function calculateUnderstandingLevel(
  wrongMultipleChoice: number,
  wrongExample: number
): 'good' | 'moderate' | 'bad' {
  const total = wrongMultipleChoice + wrongExample
  
  if (total <= 2) return 'good'
  if (total <= 4) return 'moderate'
  return 'bad'
}

/**
 * Get a color class for understanding level display
 */
export function getUnderstandingLevelColor(level: 'good' | 'moderate' | 'bad'): string {
  switch (level) {
    case 'good':
      return 'text-green-600'
    case 'moderate':
      return 'text-yellow-600'
    case 'bad':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

/**
 * Get a human-readable description for understanding level
 */
export function getUnderstandingLevelDescription(level: 'good' | 'moderate' | 'bad'): string {
  switch (level) {
    case 'good':
      return 'Good understanding (1-2 wrong answers)'
    case 'moderate':
      return 'Moderate understanding (3-4 wrong answers)'
    case 'bad':
      return 'Needs improvement (5+ wrong answers)'
    default:
      return 'Unknown level'
  }
} 