-- SQL Configuration for Dynamic Hints Storage
-- This script creates the necessary tables and functions to store dynamic hints

-- 1. Create table to store dynamic hints for student responses
CREATE TABLE IF NOT EXISTS dynamic_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) NOT NULL,
  student_id UUID REFERENCES students(id) NOT NULL,
  lesson_id UUID REFERENCES lessons(id) NOT NULL,
  concept TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  dynamic_hint TEXT NOT NULL,
  original_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one hint per student answer attempt
  UNIQUE(session_id, concept, student_answer)
);

-- 2. Create indexes for better query performance
CREATE INDEX idx_dynamic_hints_session ON dynamic_hints(session_id);
CREATE INDEX idx_dynamic_hints_student ON dynamic_hints(student_id);
CREATE INDEX idx_dynamic_hints_lesson ON dynamic_hints(lesson_id);
CREATE INDEX idx_dynamic_hints_concept ON dynamic_hints(concept);
CREATE INDEX idx_dynamic_hints_created_at ON dynamic_hints(created_at);

-- 3. Create function to store dynamic hint
CREATE OR REPLACE FUNCTION store_dynamic_hint(
  p_session_id UUID,
  p_student_id UUID,
  p_lesson_id UUID,
  p_concept TEXT,
  p_student_answer TEXT,
  p_dynamic_hint TEXT,
  p_original_hint TEXT DEFAULT NULL
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
    original_hint
  ) VALUES (
    p_session_id,
    p_student_id,
    p_lesson_id,
    p_concept,
    p_student_answer,
    p_dynamic_hint,
    p_original_hint
  )
  ON CONFLICT (session_id, concept, student_answer) 
  DO UPDATE SET
    dynamic_hint = EXCLUDED.dynamic_hint,
    original_hint = EXCLUDED.original_hint,
    created_at = NOW()
  RETURNING id INTO hint_id;
  
  RETURN hint_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to retrieve dynamic hints for a session
CREATE OR REPLACE FUNCTION get_dynamic_hints_for_session(
  p_session_id UUID
) RETURNS TABLE (
  concept TEXT,
  student_answer TEXT,
  dynamic_hint TEXT,
  original_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dh.concept,
    dh.student_answer,
    dh.dynamic_hint,
    dh.original_hint,
    dh.created_at
  FROM dynamic_hints dh
  WHERE dh.session_id = p_session_id
  ORDER BY dh.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Create view for teacher analytics on dynamic hints
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

-- 6. Create function to clean up old dynamic hints (optional - for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_dynamic_hints(
  days_to_keep INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM dynamic_hints 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Add column to chat_messages to reference dynamic hints (optional)
ALTER TABLE chat_messages 
ADD COLUMN dynamic_hint_id UUID REFERENCES dynamic_hints(id);

-- 8. Create index for the new reference
CREATE INDEX idx_chat_messages_dynamic_hint ON chat_messages(dynamic_hint_id);

-- 9. Grant necessary permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic_hints TO authenticated;
-- GRANT EXECUTE ON FUNCTION store_dynamic_hint TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_dynamic_hints_for_session TO authenticated;
-- GRANT SELECT ON teacher_hint_analytics TO authenticated;
-- GRANT EXECUTE ON FUNCTION cleanup_old_dynamic_hints TO service_role;

-- 10. Example usage queries:

-- Store a dynamic hint
-- SELECT store_dynamic_hint(
--   'session-uuid',
--   'student-uuid', 
--   'lesson-uuid',
--   'Supply and Demand',
--   'I like pizza',
--   'I can see you''re thinking about things you enjoy! Try thinking about what happens to pizza prices when lots of people want it but there aren''t many pizzas available.',
--   'Think about how price changes when availability changes'
-- );

-- Get dynamic hints for a session
-- SELECT * FROM get_dynamic_hints_for_session('session-uuid');

-- View teacher analytics
-- SELECT * FROM teacher_hint_analytics WHERE lesson_id = 'lesson-uuid';

-- Clean up old hints (run periodically)
-- SELECT cleanup_old_dynamic_hints(30); -- Keep only last 30 days 