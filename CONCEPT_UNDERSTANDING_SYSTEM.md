# Concept Understanding Tracking System

## Overview
This system tracks student understanding for each concept by counting wrong answers in multiple choice questions and example giving. The data is stored but not displayed in the UI yet.

## Database Schema

### Table: `concept_understanding_tracking`
Tracks wrong answer counts per student per concept:

```sql
- id: UUID (Primary Key)
- student_id: UUID (References students table)
- lesson_id: UUID (References lessons table) 
- concept: TEXT (The concept being tracked)
- wrong_multiple_choice_count: INTEGER (Count of wrong MC answers)
- wrong_example_count: INTEGER (Count of wrong examples)
- total_wrong_count: INTEGER (Auto-calculated via trigger)
- understanding_level: TEXT (Auto-calculated via trigger: 'good'/'moderate'/'bad')
- last_updated: TIMESTAMP (Auto-updated via trigger)
- created_at: TIMESTAMP
```

**Note**: The `total_wrong_count`, `understanding_level`, and `last_updated` fields are automatically calculated using PostgreSQL triggers for maximum compatibility.

## Understanding Levels

The system automatically calculates understanding levels based on total wrong answers:

- **Good (1-2 wrong answers)**: Student demonstrates solid understanding
- **Moderate (3-4 wrong answers)**: Student has some understanding but needs reinforcement  
- **Bad (5+ wrong answers)**: Student needs significant help with this concept

## How It Works

### 1. Automatic Tracking
- When students answer multiple choice questions, wrong answers are tracked
- When students provide examples, invalid examples are tracked
- Correct answers are not tracked (only wrong answers count)

### 2. API Endpoints

#### POST `/api/concept-understanding`
Track a wrong answer:
```json
{
  "studentId": "uuid",
  "lessonId": "uuid", 
  "concept": "Supply and Demand",
  "answerType": "multiple_choice" | "example",
  "isCorrect": false
}
```

#### GET `/api/concept-understanding`
Retrieve tracking data:
```
?studentId=uuid&lessonId=uuid&concept=conceptName
```

### 3. Integration Points

The tracking is automatically called from:
- `app/api/chat/message/route.ts` - When processing student answers
- Chat interface handles both multiple choice and example submissions

### 4. Utility Functions

Located in `lib/concept-understanding.ts`:
- `trackConceptUnderstanding()` - Track wrong answers
- `getConceptUnderstanding()` - Retrieve data
- `calculateUnderstandingLevel()` - Calculate level from counts
- `getUnderstandingLevelColor()` - Get color for UI display
- `getUnderstandingLevelDescription()` - Get human-readable descriptions

## Database Setup

1. **Via Supabase SQL Editor**:
   ```sql
   -- Copy content from apply-concept-tracking-schema.sql
   -- and run in Supabase SQL Editor
   ```

2. **Via Full Setup Script**:
   ```bash
   node run-clean-setup.js
   ```

## Example Usage

```typescript
import { trackConceptUnderstanding, getConceptUnderstanding } from '@/lib/concept-understanding'

// Track a wrong multiple choice answer
await trackConceptUnderstanding(
  'student-id',
  'lesson-id', 
  'Supply and Demand',
  'multiple_choice',
  false // isCorrect = false
)

// Get understanding data for a student
const data = await getConceptUnderstanding('student-id', 'lesson-id')
```

## Sample Data

After students interact with concepts, you'll see data like:

```json
{
  "id": "uuid",
  "student_id": "uuid", 
  "lesson_id": "uuid",
  "concept": "Supply and Demand",
  "wrong_multiple_choice_count": 2,
  "wrong_example_count": 1,
  "total_wrong_count": 3,
  "understanding_level": "moderate",
  "last_updated": "2025-01-09T10:30:00Z",
  "created_at": "2025-01-09T10:00:00Z"
}
```

## Future Enhancements

This system is designed for future personalized features:
- Adaptive difficulty based on understanding levels
- Targeted review recommendations
- Personalized study paths
- Teacher analytics dashboards
- Student progress visualization

The data is being collected now so it will be available when you implement these features! 