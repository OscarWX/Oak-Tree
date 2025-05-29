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
-- ACCOUNT TABLES
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- COURSE STRUCTURE TABLES
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
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  topic TEXT NOT NULL,
  ai_summary TEXT,
  key_concepts JSONB,
  preclass_reading TEXT,
  teacher_need TEXT,
  raw TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  ai_summary TEXT,
  key_concepts JSONB,
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- CHAT SYSTEM TABLES
-- ========================================

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  understanding_level INTEGER,
  strengths JSONB,
  misunderstandings JSONB,
  summary TEXT,
  session_state JSONB
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('ai', 'student')),
  content TEXT NOT NULL,
  content_json JSONB,
  phase TEXT CHECK (phase IN ('multiple_choice', 'example', 'feedback', 'completion')),
  dynamic_hint_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STUDENT PROGRESS TRACKING
-- ========================================

-- Student understanding table
CREATE TABLE IF NOT EXISTS student_understanding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  noted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (student_id, lesson_id, concept)
);

-- Concept progress table
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

-- Multiple choice attempts table
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

-- Chat message indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_dynamic_hint ON chat_messages(dynamic_hint_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_type ON chat_messages ((content_json->>'type'));
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_timestamp ON chat_messages (session_id, timestamp);

-- Student understanding indexes
CREATE INDEX IF NOT EXISTS idx_understanding_student ON student_understanding(student_id);
CREATE INDEX IF NOT EXISTS idx_understanding_lesson_concept ON student_understanding(lesson_id, concept);

-- Concept progress indexes
CREATE INDEX IF NOT EXISTS idx_concept_progress_session ON concept_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_concept_progress_concept ON concept_progress(concept);

-- Multiple choice attempts indexes
CREATE INDEX IF NOT EXISTS idx_mc_attempts_session ON multiple_choice_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_student ON multiple_choice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_concept ON multiple_choice_attempts(concept);
CREATE INDEX IF NOT EXISTS idx_mc_attempts_created_at ON multiple_choice_attempts(created_at);

-- Dynamic hints indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_session ON dynamic_hints(session_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_student ON dynamic_hints(student_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_lesson ON dynamic_hints(lesson_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_concept ON dynamic_hints(concept);
CREATE INDEX IF NOT EXISTS idx_dynamic_hints_created_at ON dynamic_hints(created_at);

-- ========================================
-- USEFUL VIEWS (Optional - for analytics)
-- ========================================

-- Student concept mastery view
CREATE OR REPLACE VIEW student_concept_mastery AS
SELECT 
  s.student_id,
  s.lesson_id,
  cp.concept,
  cp.phase,
  cp.attempts,
  cp.completed_at,
  su.level as understanding_level,
  l.topic as lesson_topic
FROM chat_sessions s
JOIN concept_progress cp ON cp.session_id = s.id
LEFT JOIN student_understanding su ON 
  su.student_id = s.student_id AND 
  su.lesson_id = s.lesson_id AND 
  su.concept = cp.concept
JOIN lessons l ON l.id = s.lesson_id
WHERE s.ended_at IS NOT NULL;

-- Teacher hint analytics view
CREATE OR REPLACE VIEW teacher_hint_analytics AS
SELECT 
  dh.lesson_id,
  dh.concept,
  l.topic as lesson_topic,
  l.title as lesson_title,
  COUNT(*) as total_dynamic_hints,
  COUNT(DISTINCT dh.student_id) as unique_students,
  AVG(LENGTH(dh.student_answer)) as avg_answer_length,
  AVG(LENGTH(dh.dynamic_hint)) as avg_hint_length,
  MIN(dh.created_at) as first_hint_date,
  MAX(dh.created_at) as latest_hint_date
FROM dynamic_hints dh
JOIN lessons l ON l.id = dh.lesson_id
GROUP BY dh.lesson_id, dh.concept, l.topic, l.title;

-- Multiple choice analytics view
CREATE OR REPLACE VIEW multiple_choice_analytics AS
SELECT 
  mca.lesson_id,
  mca.concept,
  l.topic as lesson_topic,
  l.title as lesson_title,
  COUNT(*) as total_attempts,
  COUNT(DISTINCT mca.student_id) as unique_students,
  SUM(CASE WHEN mca.is_correct THEN 1 ELSE 0 END) as correct_attempts,
  SUM(CASE WHEN mca.is_correct THEN 0 ELSE 1 END) as incorrect_attempts,
  ROUND(
    (SUM(CASE WHEN mca.is_correct THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
    2
  ) as success_rate,
  AVG(mca.attempt_number) as avg_attempts_per_student,
  MAX(mca.attempt_number) as max_attempts
FROM multiple_choice_attempts mca
JOIN lessons l ON l.id = mca.lesson_id
GROUP BY mca.lesson_id, mca.concept, l.topic, l.title;

-- ========================================
-- INSERT SAMPLE DATA (Optional - for testing)
-- ========================================

-- Sample teacher
INSERT INTO teachers (name, email) 
VALUES ('Test Teacher', 'teacher@example.com') 
ON CONFLICT (email) DO NOTHING;

-- Sample student
INSERT INTO students (name, email) 
VALUES ('Test Student', 'student@example.com') 
ON CONFLICT (email) DO NOTHING;

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

-- Create a function to validate teacher_id before insert
CREATE OR REPLACE FUNCTION validate_teacher_before_course_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.teacher_id IS NULL THEN
        RAISE EXCEPTION 'teacher_id cannot be NULL when creating a course';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM teachers WHERE id = NEW.teacher_id) THEN
        RAISE EXCEPTION 'teacher_id % does not exist in teachers table. Available teachers: %', 
            NEW.teacher_id, 
            (SELECT string_agg(id::text || ' (' || name || ')', ', ') FROM teachers LIMIT 5);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate teacher_id on course insert
DROP TRIGGER IF EXISTS trigger_validate_teacher_before_course_insert ON courses;
CREATE TRIGGER trigger_validate_teacher_before_course_insert
    BEFORE INSERT ON courses
    FOR EACH ROW
    EXECUTE FUNCTION validate_teacher_before_course_insert();

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