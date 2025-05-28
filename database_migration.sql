-- Migration script for standardized chat interaction model
-- This script updates the chat_messages table to support the new message format

-- 1. First, let's add a new column to store structured message content
ALTER TABLE chat_messages 
ADD COLUMN content_json JSONB;

-- 2. Migrate existing text content to JSON format
UPDATE chat_messages 
SET content_json = jsonb_build_object(
  'type', 'legacy',
  'message', content
)
WHERE content_json IS NULL;

-- 3. Create indexes for better query performance
CREATE INDEX idx_chat_messages_content_type ON chat_messages ((content_json->>'type'));
CREATE INDEX idx_chat_messages_session_timestamp ON chat_messages (session_id, timestamp);

-- 4. Add a column to track message phase in the learning flow
ALTER TABLE chat_messages
ADD COLUMN phase TEXT CHECK (phase IN ('multiple_choice', 'example', 'feedback', 'completion'));

-- 5. Update the chat_sessions table to store more detailed session state
ALTER TABLE chat_sessions
ADD COLUMN session_state JSONB;

-- 6. Create a new table to track concept-level progress
CREATE TABLE IF NOT EXISTS concept_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) NOT NULL,
  concept TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('multiple_choice', 'example', 'completed')),
  attempts INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, concept)
);

-- 7. Create a view for easier reporting on student progress
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

-- 8. Add indexes for the new table
CREATE INDEX idx_concept_progress_session ON concept_progress(session_id);
CREATE INDEX idx_concept_progress_concept ON concept_progress(concept);

-- 9. Update student_understanding table to include more granular levels
-- Level 1: Not attempted
-- Level 2: Incorrect multiple choice
-- Level 3: Correct multiple choice but struggling with example
-- Level 4: Correct multiple choice
-- Level 5: Provided valid example
ALTER TABLE student_understanding
ADD CONSTRAINT check_understanding_level CHECK (level >= 1 AND level <= 5);

-- 10. Create a function to clean up old sessions for a student-lesson pair
CREATE OR REPLACE FUNCTION clean_student_lesson_history(
  p_student_id UUID,
  p_lesson_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Delete chat messages for the sessions
  DELETE FROM chat_messages 
  WHERE session_id IN (
    SELECT id FROM chat_sessions 
    WHERE student_id = p_student_id AND lesson_id = p_lesson_id
  );
  
  -- Delete concept progress
  DELETE FROM concept_progress
  WHERE session_id IN (
    SELECT id FROM chat_sessions 
    WHERE student_id = p_student_id AND lesson_id = p_lesson_id
  );
  
  -- Delete the sessions
  DELETE FROM chat_sessions 
  WHERE student_id = p_student_id AND lesson_id = p_lesson_id;
  
  -- Delete understanding records
  DELETE FROM student_understanding
  WHERE student_id = p_student_id AND lesson_id = p_lesson_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Grant necessary permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON concept_progress TO authenticated;
-- GRANT SELECT ON student_concept_mastery TO authenticated;
-- GRANT EXECUTE ON FUNCTION clean_student_lesson_history TO authenticated; 