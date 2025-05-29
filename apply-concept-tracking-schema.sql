-- ========================================
-- CONCEPT UNDERSTANDING TRACKING SCHEMA
-- Run this in your Supabase SQL Editor
-- ========================================

-- Track wrong answers per concept per student for understanding calculation
CREATE TABLE IF NOT EXISTS concept_understanding_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  wrong_multiple_choice_count INTEGER DEFAULT 0,
  wrong_example_count INTEGER DEFAULT 0,
  total_wrong_count INTEGER DEFAULT 0,
  understanding_level TEXT DEFAULT 'good',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, lesson_id, concept)
);

-- Create a function to update calculated fields
CREATE OR REPLACE FUNCTION update_concept_understanding_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total wrong count
  NEW.total_wrong_count = NEW.wrong_multiple_choice_count + NEW.wrong_example_count;
  
  -- Calculate understanding level
  IF NEW.total_wrong_count <= 2 THEN
    NEW.understanding_level = 'good';
  ELSIF NEW.total_wrong_count <= 4 THEN
    NEW.understanding_level = 'moderate';
  ELSE
    NEW.understanding_level = 'bad';
  END IF;
  
  -- Update timestamp
  NEW.last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate fields
DROP TRIGGER IF EXISTS trigger_update_concept_understanding ON concept_understanding_tracking;
CREATE TRIGGER trigger_update_concept_understanding
  BEFORE INSERT OR UPDATE ON concept_understanding_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_concept_understanding_fields();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_concept_tracking_student ON concept_understanding_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_concept_tracking_lesson ON concept_understanding_tracking(lesson_id);
CREATE INDEX IF NOT EXISTS idx_concept_tracking_concept ON concept_understanding_tracking(concept);
CREATE INDEX IF NOT EXISTS idx_concept_tracking_level ON concept_understanding_tracking(understanding_level);
CREATE INDEX IF NOT EXISTS idx_concept_tracking_student_lesson ON concept_understanding_tracking(student_id, lesson_id);

-- Test query to verify table creation
SELECT 'Concept understanding tracking table created successfully!' as status; 