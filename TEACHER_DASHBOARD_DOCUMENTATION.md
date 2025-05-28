# Teacher Dashboard Documentation

## Overview

The Teacher Dashboard provides comprehensive insights into student progress through the chat-based learning system. Teachers can monitor student understanding, track concept mastery, and view detailed interaction histories.

## Features

### 1. Progress Overview
- **Total Sessions**: Number of learning sessions started by students
- **Completed Sessions**: Sessions that students have finished
- **Completion Rate**: Percentage of sessions completed
- **Average Understanding**: Overall understanding level across all students (1-5 scale)

### 2. Student Progress Tracking
- Individual student progress by concept
- Understanding levels for each concept
- Number of attempts per concept
- Completion status and timestamps

### 3. Detailed Analytics
- Chat history review
- Concept-specific performance
- Real-time progress monitoring

## Understanding Levels

The system tracks student understanding on a 5-point scale:

| Level | Label | Description | Color |
|-------|-------|-------------|-------|
| 1 | Not Started | Student hasn't attempted the concept | Gray |
| 2 | Struggling | Incorrect multiple choice answers | Red |
| 3 | Partial | Correct multiple choice but struggling with examples | Yellow |
| 4 | Good | Correct multiple choice answers | Blue |
| 5 | Excellent | Provided valid examples demonstrating mastery | Green |

## Dashboard Sections

### Overview Tab
- Student list with progress summaries
- Completion percentages per student
- Quick access to detailed views
- Average understanding badges

### Detailed Progress Tab
- Individual student chat histories
- Concept-by-concept understanding levels
- Recent activity timeline
- Message-level interaction review

### By Concept Tab
- Concept-centric view of student progress
- Class-wide performance on specific topics
- Identification of challenging concepts
- Progress visualization by concept

## API Endpoints

### GET `/api/teacher/progress`
Retrieves aggregated progress data for a teacher's students.

**Parameters:**
- `teacherId` (required): Teacher's unique identifier
- `courseId` (optional): Filter by specific course
- `lessonId` (optional): Filter by specific lesson

**Response:**
```json
{
  "conceptProgress": [...],
  "sessionStats": [...],
  "summary": {
    "totalSessions": 25,
    "completedSessions": 18,
    "averageUnderstanding": "3.8"
  }
}
```

### POST `/api/teacher/progress`
Retrieves detailed progress for a specific student and lesson.

**Body:**
```json
{
  "teacherId": "teacher-123",
  "studentId": "student-456",
  "lessonId": "lesson-789"
}
```

**Response:**
```json
{
  "chatHistory": [...],
  "understanding": [...],
  "lesson": {...}
}
```

## Database Schema

### Key Tables

#### `student_understanding`
Tracks understanding levels for each student-lesson-concept combination.
```sql
- student_id: UUID
- lesson_id: UUID  
- concept: TEXT
- level: INTEGER (1-5)
- noted_at: TIMESTAMP
```

#### `concept_progress`
Tracks detailed progress through the learning phases.
```sql
- session_id: UUID
- concept: TEXT
- phase: TEXT ('multiple_choice', 'example', 'completed')
- attempts: INTEGER
- completed_at: TIMESTAMP
```

#### `student_concept_mastery` (View)
Aggregated view combining progress and understanding data.

## Usage Guide

### For Teachers

1. **Access the Dashboard**
   - Navigate to `/teacher/progress`
   - Select course/lesson filters as needed

2. **Monitor Overall Progress**
   - Review summary cards for quick insights
   - Check completion rates and average understanding

3. **Investigate Individual Students**
   - Click "View Details" for specific students
   - Review chat histories and understanding levels
   - Identify students who need additional support

4. **Analyze by Concept**
   - Switch to "By Concept" tab
   - Identify challenging topics across the class
   - Plan targeted interventions

### Interpreting the Data

#### Red Flags to Watch For:
- Students with understanding level 2 (struggling)
- High number of attempts without progress
- Incomplete sessions
- Concepts with low class-wide performance

#### Positive Indicators:
- Understanding levels 4-5 (good to excellent)
- Completed sessions with valid examples
- Consistent progress across concepts
- Quick progression through phases

## Real-time Updates

The dashboard reflects real-time student progress:
- Understanding levels update immediately after student interactions
- Progress phases advance as students complete activities
- Chat histories populate in real-time
- Summary statistics recalculate automatically

## Privacy and Security

- Teachers can only view data for their own courses
- Student personal information is limited to name and email
- Chat content is preserved for educational review
- All API endpoints require teacher authentication

## Troubleshooting

### Common Issues

1. **No Data Showing**
   - Verify teacher ID is correct
   - Check that students have started sessions
   - Ensure course/lesson filters are appropriate

2. **Incomplete Progress Data**
   - Students may have started but not completed sessions
   - Check for technical issues during student interactions
   - Review chat histories for interruptions

3. **Understanding Levels Not Updating**
   - Verify API endpoints are functioning
   - Check database connectivity
   - Review error logs for failed updates

### Support

For technical issues or questions about the dashboard:
1. Check the browser console for JavaScript errors
2. Review server logs for API failures
3. Verify database connectivity and permissions
4. Contact system administrator if issues persist

## Future Enhancements

Planned improvements include:
- Export functionality for progress reports
- Email notifications for struggling students
- Comparative analytics across classes
- Integration with learning management systems
- Mobile-responsive design improvements
- Advanced filtering and search capabilities 