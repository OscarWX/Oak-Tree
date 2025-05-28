-- SQL Configuration for Multiple Choice Attempt Tracking and Dynamic Hints
-- This script extends the existing system to track multiple choice attempts and provide dynamic hints

-- 1. Create table to track multiple choice attempts per concept
CREATE TABLE IF NOT EXISTS multiple_choice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) NOT NULL,
  student_id UUID REFERENCES students(id) NOT NULL,
  lesson_id UUID REFERENCES lessons(id) NOT NULL,
  concept TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure proper ordering of attempts
  UNIQUE(session_id, concept, attempt_number)
);

-- 2. Create indexes for multiple choice attempts
CREATE INDEX idx_mc_attempts_session ON multiple_choice_attempts(session_id);
CREATE INDEX idx_mc_attempts_student ON multiple_choice_attempts(student_id);
CREATE INDEX idx_mc_attempts_concept ON multiple_choice_attempts(concept);
CREATE INDEX idx_mc_attempts_created_at ON multiple_choice_attempts(created_at);

-- 3. Extend dynamic_hints table to support multiple choice hints
ALTER TABLE dynamic_hints 
ADD COLUMN IF NOT EXISTS answer_type TEXT DEFAULT 'example' CHECK (answer_type IN ('example', 'multiple_choice'));

ALTER TABLE dynamic_hints 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- Update the unique constraint to include answer_type and attempt_number
ALTER TABLE dynamic_hints 
DROP CONSTRAINT IF EXISTS dynamic_hints_session_id_concept_student_answer_key;

ALTER TABLE dynamic_hints 
ADD CONSTRAINT dynamic_hints_unique_attempt 
UNIQUE(session_id, concept, student_answer, answer_type, attempt_number);

-- 4. Create function to track multiple choice attempts
CREATE OR REPLACE FUNCTION track_multiple_choice_attempt(
  p_session_id UUID,
  p_student_id UUID,
  p_lesson_id UUID,
  p_concept TEXT,
  p_selected_option TEXT,
  p_correct_option TEXT,
  p_is_correct BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
  attempt_num INTEGER;
BEGIN
  -- Get the next attempt number for this concept
  SELECT COALESCE(MAX(attempt_number), 0) + 1 
  INTO attempt_num
  FROM multiple_choice_attempts 
  WHERE session_id = p_session_id AND concept = p_concept;
  
  -- Insert the attempt record
  INSERT INTO multiple_choice_attempts (
    session_id,
    student_id,
    lesson_id,
    concept,
    selected_option,
    correct_option,
    is_correct,
    attempt_number
  ) VALUES (
    p_session_id,
    p_student_id,
    p_lesson_id,
    p_concept,
    p_selected_option,
    p_correct_option,
    p_is_correct,
    attempt_num
  );
  
  RETURN attempt_num;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to get multiple choice attempt count
CREATE OR REPLACE FUNCTION get_multiple_choice_attempt_count(
  p_session_id UUID,
  p_concept TEXT
) RETURNS INTEGER AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO attempt_count
  FROM multiple_choice_attempts 
  WHERE session_id = p_session_id 
    AND concept = p_concept 
    AND is_correct = FALSE;
  
  RETURN COALESCE(attempt_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 6. Enhanced function to store dynamic hints (supports both example and multiple choice)
CREATE OR REPLACE FUNCTION store_dynamic_hint_enhanced(
  p_session_id UUID,
  p_student_id UUID,
  p_lesson_id UUID,
  p_concept TEXT,
  p_student_answer TEXT,
  p_dynamic_hint TEXT,
  p_original_hint TEXT DEFAULT NULL,
  p_answer_type TEXT DEFAULT 'example',
  p_attempt_number INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  hint_id UUID;
BEGIN
  INSERT INTO dynamic_hints (
    session_id,
    student_id,
    lesson_id,
    concept,
    student_answer,
    dynamic_hint,
    original_hint,
    answer_type,
    attempt_number
  ) VALUES (
    p_session_id,
    p_student_id,
    p_lesson_id,
    p_concept,
    p_student_answer,
    p_dynamic_hint,
    p_original_hint,
    p_answer_type,
    p_attempt_number
  )
  ON CONFLICT (session_id, concept, student_answer, answer_type, attempt_number) 
  DO UPDATE SET
    dynamic_hint = EXCLUDED.dynamic_hint,
    original_hint = EXCLUDED.original_hint,
    created_at = NOW()
  RETURNING id INTO hint_id;
  
  RETURN hint_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create view for multiple choice analytics
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

-- 8. Create view for comprehensive hint analytics
CREATE OR REPLACE VIEW comprehensive_hint_analytics AS
SELECT 
  dh.lesson_id,
  dh.concept,
  dh.answer_type,
  l.topic as lesson_topic,
  l.title as lesson_title,
  COUNT(*) as total_hints,
  COUNT(DISTINCT dh.student_id) as unique_students,
  AVG(LENGTH(dh.student_answer)) as avg_answer_length,
  AVG(LENGTH(dh.dynamic_hint)) as avg_hint_length,
  AVG(dh.attempt_number) as avg_attempt_number,
  MIN(dh.created_at) as first_hint_date,
  MAX(dh.created_at) as latest_hint_date
FROM dynamic_hints dh
JOIN lessons l ON l.id = dh.lesson_id
GROUP BY dh.lesson_id, dh.concept, dh.answer_type, l.topic, l.title;

-- 9. Example usage queries:

-- Track a multiple choice attempt
-- SELECT track_multiple_choice_attempt(
--   'session-uuid',
--   'student-uuid',
--   'lesson-uuid',
--   'Supply and Demand',
--   'b',
--   'a',
--   false
-- );

-- Get attempt count for a concept
-- SELECT get_multiple_choice_attempt_count('session-uuid', 'Supply and Demand');

-- Store a multiple choice dynamic hint
-- SELECT store_dynamic_hint_enhanced(
--   'session-uuid',
--   'student-uuid', 
--   'lesson-uuid',
--   'Supply and Demand',
--   'Option B: When demand increases, prices decrease',
--   'I can see why you might think that, but actually when demand increases, prices usually go up! Think about concert tickets - when more people want them, do they get cheaper?',
--   'Think about the relationship between demand and price',
--   'multiple_choice',
--   1
-- );

-- View multiple choice analytics
-- SELECT * FROM multiple_choice_analytics WHERE lesson_id = 'lesson-uuid';

-- View comprehensive hint analytics
-- SELECT * FROM comprehensive_hint_analytics WHERE lesson_id = 'lesson-uuid'; 