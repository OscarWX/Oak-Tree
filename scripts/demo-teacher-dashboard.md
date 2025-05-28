# Teacher Dashboard Demo Script

## Setup

This demo showcases the teacher dashboard functionality for monitoring student progress in the chat-based learning system.

### Prerequisites
1. Database with sample student data
2. Completed chat sessions with various understanding levels
3. Teacher account with access to courses and lessons

## Demo Flow

### 1. Dashboard Overview (2 minutes)

**Navigate to:** `/teacher/progress`

**Show:**
- Summary cards displaying key metrics
- Total sessions, completed sessions, completion rate
- Average understanding level across all students

**Talking Points:**
- "Here's the main teacher dashboard where you can monitor all student progress"
- "These summary cards give you an immediate overview of class performance"
- "The average understanding level helps identify if students are grasping concepts"

### 2. Course and Lesson Filtering (1 minute)

**Demonstrate:**
- Select different courses from dropdown
- Filter by specific lessons
- Show how data updates based on filters

**Talking Points:**
- "You can filter by specific courses or lessons to focus your analysis"
- "This is helpful when you want to see how students performed on particular topics"
- "The data updates in real-time as you change filters"

### 3. Student Progress Overview Tab (3 minutes)

**Show:**
- List of students with progress summaries
- Completion percentages per student
- Understanding level badges (color-coded)
- Progress bars showing concept completion

**Highlight:**
- Students with different understanding levels
- Varying completion rates
- Students who might need additional support

**Talking Points:**
- "Each student is shown with their overall progress"
- "The colored badges indicate understanding levels - red means struggling, green means excellent"
- "You can quickly identify students who need extra help"

### 4. Detailed Progress View (4 minutes)

**Demonstrate:**
- Click "View Details" for a specific student
- Show concept-by-concept understanding levels
- Review chat history and interactions
- Point out timestamps and message types

**Show Different Student Types:**
- High-performing student (mostly green badges)
- Struggling student (red/yellow badges)
- Student with mixed performance

**Talking Points:**
- "Here you can see exactly how each student performed on individual concepts"
- "The chat history shows the actual conversation between the student and our AI characters"
- "You can see where students got stuck or excelled"
- "This helps you understand their thought process and provide targeted feedback"

### 5. By Concept Analysis (3 minutes)

**Navigate to:** "By Concept" tab

**Show:**
- Concepts grouped together
- Class-wide performance on each concept
- Students struggling with specific topics
- Progress indicators for each student-concept pair

**Talking Points:**
- "This view helps you identify which concepts are challenging for the class"
- "You can see patterns - if many students struggle with the same concept"
- "This informs your teaching strategy for future lessons"
- "You can plan targeted review sessions for difficult concepts"

### 6. Understanding Levels Deep Dive (2 minutes)

**Explain the 5-level system:**
- Level 1 (Gray): Not Started
- Level 2 (Red): Struggling - incorrect multiple choice
- Level 3 (Yellow): Partial - correct MC but struggling with examples
- Level 4 (Blue): Good - correct multiple choice
- Level 5 (Green): Excellent - provided valid examples

**Show examples of each level in the dashboard**

### 7. Real-time Updates (1 minute)

**Demonstrate:**
- Explain how data updates as students interact
- Show recent activity in detailed view
- Mention that teachers can monitor progress live

**Talking Points:**
- "The dashboard updates in real-time as students work"
- "You can monitor progress during class or homework time"
- "No need to refresh - data appears automatically"

## Sample Data Scenarios

### Scenario A: High-Performing Class
- Most students at levels 4-5
- High completion rates (80%+)
- Few struggling students

### Scenario B: Mixed Performance
- Students at various levels
- Some concepts more challenging than others
- Clear patterns of difficulty

### Scenario C: Struggling Class
- Many students at levels 2-3
- Lower completion rates
- Specific concepts causing widespread difficulty

## Key Benefits to Highlight

1. **Immediate Insights**: No waiting for test results
2. **Granular Detail**: Concept-level understanding
3. **Process Visibility**: See how students think through problems
4. **Early Intervention**: Identify struggling students quickly
5. **Data-Driven Teaching**: Adjust instruction based on real data
6. **Individual Support**: Tailor help to specific student needs

## Common Questions & Answers

**Q: How often does the data update?**
A: Real-time - as soon as students submit responses

**Q: Can I see what students actually typed?**
A: Yes, the detailed view shows complete chat histories

**Q: How do you determine understanding levels?**
A: Based on multiple choice accuracy and quality of examples provided

**Q: Can I export this data?**
A: Currently view-only, but export functionality is planned

**Q: What if a student's session was interrupted?**
A: You can see incomplete sessions and their progress up to that point

## Follow-up Actions

After the demo, teachers typically want to:
1. Set up their own courses and lessons
2. Review existing student data
3. Plan interventions for struggling students
4. Adjust teaching strategies based on insights
5. Schedule regular progress reviews

## Technical Notes

- Dashboard works on desktop and tablet
- Requires modern web browser
- Data is secured and privacy-compliant
- Teachers only see their own students
- System handles concurrent users efficiently 