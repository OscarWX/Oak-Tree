# Student Understanding System

## Overview

The Student Understanding System tracks and displays real-time analytics about student comprehension based on their interactions with Chirpy and Sage during chat sessions. This system replaces the previous mock data with actual database-driven insights.

## Database Schema

### `student_understanding` Table
```sql
CREATE TABLE student_understanding (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  concept text NOT NULL,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 4),
  noted_at timestamp with time zone DEFAULT now(),
  UNIQUE (student_id, lesson_id, concept)
);
```

### Understanding Levels
- **Level 1**: Severe misunderstanding (requires significant help)
- **Level 2**: Moderate misunderstanding (needs clarification)
- **Level 3**: Minor confusion (small gaps)
- **Level 4**: Good understanding (minimal issues)

## API Endpoints

### GET `/api/student-understanding?lessonId={id}`

Fetches comprehensive understanding data for a specific lesson.

**Response Structure:**
```json
{
  "students": [
    {
      "id": "student-uuid",
      "name": "Student Name",
      "understanding": 75,
      "averageLevel": 3.0,
      "lastActive": "12/15/2023",
      "concepts": [
        {
          "concept": "addition",
          "level": 3,
          "noted_at": "2023-12-15T10:30:00Z"
        }
      ],
      "strengths": ["basic arithmetic", "number recognition"],
      "misunderstandings": ["carrying over", "place value"]
    }
  ],
  "classAverage": 68,
  "commonMisunderstandings": [
    {
      "concept": "carrying over",
      "count": 3
    }
  ],
  "totalStudents": 5
}
```

## Frontend Components

### `StudentUnderstandingTab`
- **Location**: `components/teacher/StudentUnderstandingTab.tsx`
- **Features**:
  - Real-time data fetching from API
  - Refresh button for manual updates
  - Class overview with average understanding
  - Individual student cards with detailed analytics
  - Common misunderstandings display
  - Concept-level tracking with color coding

### Key Features

1. **Real-time Analytics**: Fetches actual data from the database instead of mock data
2. **Refresh Functionality**: Teachers can manually refresh data to see latest updates
3. **Comprehensive Insights**: Shows both strengths and areas needing improvement
4. **Visual Indicators**: Color-coded badges and progress bars for quick assessment
5. **Concept Tracking**: Detailed view of which specific concepts students struggle with

## Data Flow

1. **Chat Session**: Student interacts with Chirpy and Sage
2. **Level Assessment**: Sage evaluates misunderstanding level (1-4) for each concept
3. **Database Storage**: Level is stored in `student_understanding` table
4. **API Aggregation**: `/api/student-understanding` aggregates data per lesson
5. **Teacher Dashboard**: Real-time display of student analytics with refresh capability

## Usage

### For Teachers
1. Navigate to any lesson in the teacher dashboard
2. Click on the "Understanding" tab
3. View class overview and individual student analytics
4. Use the refresh button to get latest data
5. Identify students who need additional help based on misunderstanding levels

### For Developers
1. The system automatically tracks understanding during chat sessions
2. No manual intervention required for data collection
3. API can be extended to support additional analytics
4. Frontend components are modular and reusable

## Migration from Mock Data

The system has been updated to:
- Remove hardcoded mock percentages
- Replace deterministic "random" data with real database queries
- Provide actual insights based on student-AI interactions
- Enable real-time updates through refresh functionality

## Future Enhancements

- Automatic refresh intervals
- Historical trend analysis
- Predictive analytics for learning outcomes
- Integration with lesson planning tools
- Export functionality for detailed reports 