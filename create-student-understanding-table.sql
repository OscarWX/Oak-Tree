/* Migration: create-student-understanding-table.sql
   Purpose : Store a student's level of understanding (triggering Sage) for each lesson concept.
*/

-- Enable UUID extension if it is not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table to track student misunderstanding levels (1 = severe, 4 = minor)
CREATE TABLE IF NOT EXISTS student_understanding (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  concept text NOT NULL,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 4),
  noted_at timestamp with time zone DEFAULT now(),
  UNIQUE (student_id, lesson_id, concept) -- one row per concept per student/lesson
);

-- Helpful index for queries filtering by student
CREATE INDEX IF NOT EXISTS idx_understanding_student ON student_understanding(student_id);

-- Helpful index for aggregation by lesson and concept
CREATE INDEX IF NOT EXISTS idx_understanding_lesson_concept ON student_understanding(lesson_id, concept); 