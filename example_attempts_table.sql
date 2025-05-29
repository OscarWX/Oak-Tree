-- Create table for tracking example attempts (both correct and incorrect)
CREATE TABLE IF NOT EXISTS example_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  student_example TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, concept, attempt_number)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_example_attempts_session ON example_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_example_attempts_student ON example_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_example_attempts_lesson ON example_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_example_attempts_concept ON example_attempts(concept);
CREATE INDEX IF NOT EXISTS idx_example_attempts_is_correct ON example_attempts(is_correct);
CREATE INDEX IF NOT EXISTS idx_example_attempts_student_lesson ON example_attempts(student_id, lesson_id);

-- Comment for documentation
COMMENT ON TABLE example_attempts IS 'Tracks student example submissions for each concept, including both correct and incorrect attempts'; 