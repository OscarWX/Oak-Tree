-- ===================================================================
-- COMPLETE DATABASE BACKUP SCRIPT FOR OAKTREE
-- Run this BEFORE making any changes to your database
-- This will create backup tables with all your current data
-- ===================================================================

-- Create timestamp for this backup
DO $$
DECLARE
    backup_timestamp TEXT := to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
BEGIN
    RAISE NOTICE 'Creating backup with timestamp: %', backup_timestamp;
END $$;

-- ===================================================================
-- BACKUP ALL EXISTING TABLES (with current timestamp)
-- ===================================================================

-- Backup teachers table
CREATE TABLE backup_teachers_2024_11_29 AS SELECT * FROM teachers;

-- Backup students table  
CREATE TABLE backup_students_2024_11_29 AS SELECT * FROM students;

-- Backup courses table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
        EXECUTE 'CREATE TABLE backup_courses_2024_11_29 AS SELECT * FROM courses';
        RAISE NOTICE 'Backed up courses table';
    ELSE
        RAISE NOTICE 'courses table does not exist, skipping backup';
    END IF;
END $$;

-- Backup lessons table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons') THEN
        EXECUTE 'CREATE TABLE backup_lessons_2024_11_29 AS SELECT * FROM lessons';
        RAISE NOTICE 'Backed up lessons table';
    ELSE
        RAISE NOTICE 'lessons table does not exist, skipping backup';
    END IF;
END $$;

-- Backup materials table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') THEN
        EXECUTE 'CREATE TABLE backup_materials_2024_11_29 AS SELECT * FROM materials';
        RAISE NOTICE 'Backed up materials table';
    ELSE
        RAISE NOTICE 'materials table does not exist, skipping backup';
    END IF;
END $$;

-- Backup chat_sessions table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        EXECUTE 'CREATE TABLE backup_chat_sessions_2024_11_29 AS SELECT * FROM chat_sessions';
        RAISE NOTICE 'Backed up chat_sessions table';
    ELSE
        RAISE NOTICE 'chat_sessions table does not exist, skipping backup';
    END IF;
END $$;

-- Backup chat_messages table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        EXECUTE 'CREATE TABLE backup_chat_messages_2024_11_29 AS SELECT * FROM chat_messages';
        RAISE NOTICE 'Backed up chat_messages table';
    ELSE
        RAISE NOTICE 'chat_messages table does not exist, skipping backup';
    END IF;
END $$;

-- Backup student_understanding table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_understanding') THEN
        EXECUTE 'CREATE TABLE backup_student_understanding_2024_11_29 AS SELECT * FROM student_understanding';
        RAISE NOTICE 'Backed up student_understanding table';
    ELSE
        RAISE NOTICE 'student_understanding table does not exist, skipping backup';
    END IF;
END $$;

-- Backup concept_progress table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'concept_progress') THEN
        EXECUTE 'CREATE TABLE backup_concept_progress_2024_11_29 AS SELECT * FROM concept_progress';
        RAISE NOTICE 'Backed up concept_progress table';
    ELSE
        RAISE NOTICE 'concept_progress table does not exist, skipping backup';
    END IF;
END $$;

-- Backup multiple_choice_attempts table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'multiple_choice_attempts') THEN
        EXECUTE 'CREATE TABLE backup_multiple_choice_attempts_2024_11_29 AS SELECT * FROM multiple_choice_attempts';
        RAISE NOTICE 'Backed up multiple_choice_attempts table';
    ELSE
        RAISE NOTICE 'multiple_choice_attempts table does not exist, skipping backup';
    END IF;
END $$;

-- Backup dynamic_hints table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dynamic_hints') THEN
        EXECUTE 'CREATE TABLE backup_dynamic_hints_2024_11_29 AS SELECT * FROM dynamic_hints';
        RAISE NOTICE 'Backed up dynamic_hints table';
    ELSE
        RAISE NOTICE 'dynamic_hints table does not exist, skipping backup';
    END IF;
END $$;

-- ===================================================================
-- VERIFICATION - Show what was backed up
-- ===================================================================

-- Show backup tables created
SELECT 
    table_name,
    (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) as c FROM %I', table_name), false, true, '')))[1]::text::int AS row_count
FROM information_schema.tables 
WHERE table_name LIKE 'backup_%_2024_11_29'
ORDER BY table_name;

-- ===================================================================
-- RECOVERY INSTRUCTIONS
-- ===================================================================

/*
🔄 TO RESTORE FROM BACKUP (if something goes wrong):

1. Drop the problematic tables:
   DROP TABLE IF EXISTS courses CASCADE;
   DROP TABLE IF EXISTS lessons CASCADE;
   DROP TABLE IF EXISTS materials CASCADE;
   DROP TABLE IF EXISTS chat_sessions CASCADE;
   DROP TABLE IF EXISTS chat_messages CASCADE;
   DROP TABLE IF EXISTS student_understanding CASCADE;
   DROP TABLE IF EXISTS concept_progress CASCADE;
   DROP TABLE IF EXISTS multiple_choice_attempts CASCADE;
   DROP TABLE IF EXISTS dynamic_hints CASCADE;

2. Restore from backup:
   CREATE TABLE teachers AS SELECT * FROM backup_teachers_2024_11_29;
   CREATE TABLE students AS SELECT * FROM backup_students_2024_11_29;
   CREATE TABLE courses AS SELECT * FROM backup_courses_2024_11_29;
   CREATE TABLE lessons AS SELECT * FROM backup_lessons_2024_11_29;
   CREATE TABLE materials AS SELECT * FROM backup_materials_2024_11_29;
   CREATE TABLE chat_sessions AS SELECT * FROM backup_chat_sessions_2024_11_29;
   CREATE TABLE chat_messages AS SELECT * FROM backup_chat_messages_2024_11_29;
   CREATE TABLE student_understanding AS SELECT * FROM backup_student_understanding_2024_11_29;
   CREATE TABLE concept_progress AS SELECT * FROM backup_concept_progress_2024_11_29;
   CREATE TABLE multiple_choice_attempts AS SELECT * FROM backup_multiple_choice_attempts_2024_11_29;
   CREATE TABLE dynamic_hints AS SELECT * FROM backup_dynamic_hints_2024_11_29;

3. Clean up backup tables when you're sure everything works:
   DROP TABLE backup_teachers_2024_11_29;
   DROP TABLE backup_students_2024_11_29;
   -- etc...
*/

RAISE NOTICE '✅ BACKUP COMPLETED! Your data is now safely backed up in tables with _2024_11_29 suffix';
RAISE NOTICE '⚠️  Remember: Keep these backup tables until you are 100% sure the new setup works!'; 