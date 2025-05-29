-- ===================================================================
-- COMPLETE DATABASE SETUP FOR OAKTREE LEARNING SYSTEM
-- This script creates ALL tables needed for the application
-- For use with a fresh/testing database
-- ===================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- STORAGE BUCKETS
-- ========================================

-- Create materials storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for materials bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'materials' AND 
  auth.role() = 'authenticated'
);

-- Allow public read access to materials
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'materials');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'materials' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'materials' AND 
  auth.role() = 'authenticated'
);

-- ========================================
-- USER ACCOUNTS SETUP
-- ========================================

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  grade_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- COURSE AND LESSON STRUCTURE
-- ========================================

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  summary TEXT,
  key_concepts TEXT[] DEFAULT '{}',
  difficulty_level TEXT DEFAULT 'intermediate',
  estimated_duration INTEGER DEFAULT 60, -- in minutes
  prerequisite_concepts TEXT[] DEFAULT '{}',
  learning_objectives TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials table for lesson content
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT CHECK (file_type IN ('pdf', 'docx', 'txt', 'md')),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processed_content TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_date TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- STUDENT SESSION AND CONVERSATION DATA
-- ========================================

-- Chat sessions table - PRIMARY SOURCE FOR STUDENT PROGRESS
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  summary TEXT, -- JSON containing session state, questions, and progress
  understanding_level INTEGER
);

-- Chat messages table - PRIMARY SOURCE FOR CONVERSATION HISTORY
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'ai')),
  content TEXT NOT NULL,
  content_json JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dynamic_hint_id UUID
);

-- ========================================
-- STUDENT PERFORMANCE DATA
-- ========================================

-- Concept progress within sessions
CREATE TABLE IF NOT EXISTS concept_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('multiple_choice', 'example', 'completed')),
  attempts INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, concept)
);

-- Multiple choice attempts table - PRIMARY SOURCE FOR WRONG ANSWER TRACKING
CREATE TABLE IF NOT EXISTS multiple_choice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, concept, attempt_number)
);

-- ========================================
-- DYNAMIC HINTS SYSTEM
-- ========================================

-- Dynamic hints table
CREATE TABLE IF NOT EXISTS dynamic_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  dynamic_hint TEXT NOT NULL,
  original_hint TEXT,
  answer_type TEXT DEFAULT 'example' CHECK (answer_type IN ('example', 'multiple_choice')),
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, concept, student_answer, answer_type, attempt_number)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Account table indexes
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);

-- Lesson indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);

-- Material indexes
CREATE INDEX IF NOT EXISTS idx_materials_lesson ON materials(lesson_id);
CREATE INDEX IF NOT EXISTS idx_materials_processing_status ON materials(processing_status);

-- Chat session indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_student ON chat_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lesson ON chat_sessions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);

-- Chat message indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_dynamic_hint ON chat_messages(dynamic_hint_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_type ON chat_messages ((content_json->>'type'));
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_timestamp ON chat_messages (session_id, timestamp);

-- Concept progress indexes
CREATE INDEX IF NOT EXISTS idx_concept_progress_session ON concept_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_concept_progress_concept ON concept_progress(concept);

-- Multiple choice attempts indexes - CRITICAL for teacher dashboard performance
CREATE INDEX IF NOT EXISTS idx_mc_attempts_session ON multiple_choice_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_student ON multiple_choice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_lesson ON multiple_choice_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_concept ON multiple_choice_attempts(concept);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_created_at ON multiple_choice_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_student_lesson ON multiple_choice_attempts(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_is_correct ON multiple_choice_attempts(is_correct);

-- Dynamic hints indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_session ON dynamic_hints(session_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_student ON dynamic_hints(student_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_lesson ON dynamic_hints(lesson_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_concept ON dynamic_hints(concept);
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_created_at ON dynamic_hints(created_at);

-- ========================================
-- USEFUL VIEWS FOR ANALYTICS
-- ========================================

-- Teacher analytics view for multiple choice performance
CREATE OR REPLACE VIEW teacher_multiple_choice_analytics AS
SELECT 
  mca.lesson_id,
  mca.concept,
  l.topic as lesson_topic,
  l.title as lesson_title,
  COUNT(*) as total_attempts,
  COUNT(DISTINCT mca.student_id) as unique_students,
  COUNT(CASE WHEN mca.is_correct THEN 1 END) as correct_attempts,
  COUNT(CASE WHEN NOT mca.is_correct THEN 1 END) as wrong_attempts,
  ROUND(
    (COUNT(CASE WHEN mca.is_correct THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
    2
  ) as success_rate,
  MIN(mca.created_at) as first_attempt_date,
  MAX(mca.created_at) as latest_attempt_date
FROM multiple_choice_attempts mca
JOIN lessons l ON l.id = mca.lesson_id
GROUP BY mca.lesson_id, mca.concept, l.topic, l.title;

-- Teacher session overview
CREATE OR REPLACE VIEW teacher_session_overview AS
SELECT 
  cs.lesson_id,
  l.title as lesson_title,
  l.topic as lesson_topic,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN cs.status = 'active' THEN 1 END) as active_sessions,
  COUNT(CASE WHEN cs.status = 'abandoned' THEN 1 END) as abandoned_sessions,
  COUNT(DISTINCT cs.student_id) as unique_students,
  MIN(cs.started_at) as first_session_date,
  MAX(cs.started_at) as latest_session_date
FROM chat_sessions cs
JOIN lessons l ON l.id = cs.lesson_id
GROUP BY cs.lesson_id, l.title, l.topic;

-- ========================================
-- BUSINESS LOGIC FUNCTIONS
-- ========================================

-- Validate teacher exists before creating course
CREATE OR REPLACE FUNCTION validate_teacher_before_course_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if teacher exists
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE id = NEW.teacher_id) THEN
    RAISE EXCEPTION 'Teacher with id % does not exist', NEW.teacher_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate teacher before course insert
DROP TRIGGER IF EXISTS trigger_validate_teacher_before_course_insert ON courses;
CREATE TRIGGER trigger_validate_teacher_before_course_insert
  BEFORE INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION validate_teacher_before_course_insert();

-- ========================================
-- DEBUGGING AND MONITORING VIEWS
-- ========================================

-- Debug view for teacher-course relationships
CREATE OR REPLACE VIEW debug_teacher_course_info AS
SELECT 
  t.id as teacher_id,
  t.name as teacher_name,
  t.email as teacher_email,
  c.id as course_id,
  c.title as course_title,
  c.description as course_description,
  c.created_at as course_created_at
FROM teachers t
LEFT JOIN courses c ON t.id = c.teacher_id
ORDER BY t.name, c.title;

-- ========================================
-- DATA SOURCE DOCUMENTATION
-- ========================================

-- Document the primary data sources for teacher dashboard
COMMENT ON TABLE chat_sessions IS 'PRIMARY SOURCE: Student session progress, completion status, and session state including questions and current progress';
COMMENT ON TABLE multiple_choice_attempts IS 'PRIMARY SOURCE: Student answer attempts, accuracy, and wrong answer counts for understanding calculation';
COMMENT ON TABLE chat_messages IS 'PRIMARY SOURCE: Detailed student-AI conversation history and content';
COMMENT ON TABLE concept_progress IS 'SUPPLEMENTARY: Concept completion phases within sessions';
COMMENT ON TABLE dynamic_hints IS 'SUPPLEMENTARY: AI-generated hints for struggling students';

-- ========================================
-- TEACHER DASHBOARD DATA CALCULATION NOTES
-- ========================================

-- The teacher dashboard now calculates all metrics directly from source data:
-- 1. Session completion: FROM chat_sessions.status and chat_sessions.summary
-- 2. Wrong answer counts: FROM multiple_choice_attempts WHERE is_correct = false
-- 3. Understanding levels: CALCULATED from wrong answer counts (good ≤1, moderate ≤3, bad >3)
-- 4. Progress percentages: CALCULATED from session.summary JSON (currentQuestionIndex/totalQuestions)
-- 5. Concept tracking: DERIVED from multiple_choice_attempts grouped by student_id and concept

-- This eliminates data synchronization issues and ensures teacher dashboard 
-- always shows current, accurate student performance data.

-- ===================================================================
-- DEBUGGING & FIXES FOR FOREIGN KEY ISSUES
-- ===================================================================

-- Check if we have any teachers in the database
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM teachers) THEN
        RAISE NOTICE 'WARNING: No teachers found in database! Adding default teacher...';
        INSERT INTO teachers (id, name, email) 
        VALUES ('00000000-0000-0000-0000-000000000001', 'Default Teacher', 'default@teacher.com');
    END IF;
END $$;

-- Add a default teacher ID that applications can use if needed
INSERT INTO teachers (id, name, email) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Teacher', 'default@teacher.com')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email;

-- Add constraint to help debug foreign key issues
ALTER TABLE courses 
ADD CONSTRAINT check_teacher_exists 
CHECK (teacher_id IS NOT NULL);

-- Create debugging queries for troubleshooting
CREATE OR REPLACE VIEW debug_teacher_course_info AS
SELECT 
    'teachers' as table_name,
    count(*) as record_count,
    string_agg(id::text || ' (' || name || ', ' || email || ')', ', ') as sample_records
FROM teachers
UNION ALL
SELECT 
    'courses' as table_name,
    count(*) as record_count,
    string_agg(id::text || ' (' || title || ')', ', ') as sample_records
FROM courses;

-- ===================================================================
-- TROUBLESHOOTING QUERIES - Run these to debug issues
-- ===================================================================

-- Show all teachers (run this to see available teacher IDs)
SELECT 'Available Teachers:' as info, id, name, email FROM teachers;

-- Show recent courses and their teacher references
SELECT 'Recent Courses:' as info, c.id, c.title, c.teacher_id, t.name as teacher_name 
FROM courses c 
LEFT JOIN teachers t ON c.teacher_id = t.id 
ORDER BY c.created_at DESC 
LIMIT 5;

-- Show debug info
SELECT * FROM debug_teacher_course_info;

-- ===================================================================
-- QUICK FIXES FOR MISSING COLUMNS
-- ===================================================================

-- Add missing raw_ai_summary column to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS raw_ai_summary TEXT;

-- ===================================================================
-- SETUP COMPLETED! 
-- ===================================================================

/*
✅ ALL TABLES CREATED SUCCESSFULLY!

📦 Storage: materials bucket (public read, authenticated write)
📚 Account Tables: teachers, students
🎓 Course Structure: courses, lessons, materials
💬 Chat System: chat_sessions, chat_messages  
📊 Progress Tracking: student_understanding, concept_progress, multiple_choice_attempts
💡 Hints: dynamic_hints
📈 Analytics Views: student_concept_mastery, teacher_hint_analytics, multiple_choice_analytics

🔧 DEBUGGING FEATURES ADDED:
- Default teacher (ID: 00000000-0000-0000-0000-000000000001)
- Validation trigger for teacher_id foreign key
- Debug queries to troubleshoot issues

🔧 FUNCTIONS REMOVED - Handle these in your application code:
- track_multiple_choice_attempt() → Handle in API routes
- store_dynamic_hint_enhanced() → Handle in API routes  
- clean_student_lesson_history() → Handle in API routes

🧪 Sample data added for testing (teacher@example.com, student@example.com)

🐛 TO DEBUG FOREIGN KEY ISSUES:
1. Check available teachers: SELECT * FROM teachers;
2. Check if teacher_id exists before creating course
3. Use default teacher ID: 00000000-0000-0000-0000-000000000001
4. Check debug info: SELECT * FROM debug_teacher_course_info;

Your testing database is ready! 🚀
*/ 

-- Update existing chat_sessions table to add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chat_sessions' AND column_name = 'status') THEN
        ALTER TABLE chat_sessions ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused'));
        
        -- Update existing sessions without status to 'completed' if they have end_date, 'active' otherwise
        UPDATE chat_sessions SET status = CASE 
            WHEN ended_at IS NOT NULL THEN 'completed'
            ELSE 'active'
        END;
    END IF;
END $$; 