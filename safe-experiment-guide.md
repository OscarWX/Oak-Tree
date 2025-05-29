# 🛡️ SAFE DATABASE EXPERIMENTATION GUIDE

## **STEP 1: BACKUP EVERYTHING FIRST** ⚠️

**Before doing ANYTHING else, run this:**

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the entire content of `backup-database.sql`
3. Click "Run" 
4. Wait for completion (should show backup tables created)

**This creates backup copies of all your data with `_2024_11_29` suffix**

---

## **STEP 2: SAFE EXPERIMENTATION PROCESS** 🧪

### **Option A: Test on One Table First (Safest)**
1. **Pick ONE non-critical table to test with** (e.g., `multiple_choice_attempts`)
2. **Drop only that table**: `DROP TABLE multiple_choice_attempts;`
3. **Recreate just that table** using the relevant section from `clean_database_setup.sql`
4. **Test your app** - does it still work?
5. **If it works**: proceed to next table
6. **If it breaks**: restore that table from backup

### **Option B: Full Clean Setup (Once you're confident)**
1. **Keep only**: `teachers` and `students` tables
2. **Delete all other tables** (you have backups!)
3. **Run the complete** `clean_database_setup.sql`
4. **Test your application**

---

## **STEP 3: RECOVERY PLANS** 🔄

### **If ONE table has issues:**
```sql
-- Example: Restore just the courses table
DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses AS SELECT * FROM backup_courses_2024_11_29;
```

### **If EVERYTHING breaks:**
```sql
-- 1. Drop all problematic tables
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS student_understanding CASCADE;
DROP TABLE IF EXISTS concept_progress CASCADE;
DROP TABLE IF EXISTS multiple_choice_attempts CASCADE;
DROP TABLE IF EXISTS dynamic_hints CASCADE;

-- 2. Restore everything from backup
CREATE TABLE courses AS SELECT * FROM backup_courses_2024_11_29;
CREATE TABLE lessons AS SELECT * FROM backup_lessons_2024_11_29;
CREATE TABLE materials AS SELECT * FROM backup_materials_2024_11_29;
CREATE TABLE chat_sessions AS SELECT * FROM backup_chat_sessions_2024_11_29;
CREATE TABLE chat_messages AS SELECT * FROM backup_chat_messages_2024_11_29;
CREATE TABLE student_understanding AS SELECT * FROM backup_student_understanding_2024_11_29;
CREATE TABLE concept_progress AS SELECT * FROM backup_concept_progress_2024_11_29;
CREATE TABLE multiple_choice_attempts AS SELECT * FROM backup_multiple_choice_attempts_2024_11_29;
CREATE TABLE dynamic_hints AS SELECT * FROM backup_dynamic_hints_2024_11_29;
```

---

## **STEP 4: TESTING CHECKLIST** ✅

After any changes, test these:

- [ ] **Login as teacher** - can you see dashboard?
- [ ] **Login as student** - can you access lessons?
- [ ] **Create a course** - does it save?
- [ ] **Upload material** - does it process?
- [ ] **Start a chat session** - does it work?
- [ ] **Submit answers** - do they save?

---

## **STEP 5: CLEANUP (When everything works)** 🧹

Only after you're 100% sure everything works:

```sql
-- Remove backup tables
DROP TABLE backup_teachers_2024_11_29;
DROP TABLE backup_students_2024_11_29;
DROP TABLE backup_courses_2024_11_29;
DROP TABLE backup_lessons_2024_11_29;
DROP TABLE backup_materials_2024_11_29;
DROP TABLE backup_chat_sessions_2024_11_29;
DROP TABLE backup_chat_messages_2024_11_29;
DROP TABLE backup_student_understanding_2024_11_29;
DROP TABLE backup_concept_progress_2024_11_29;
DROP TABLE backup_multiple_choice_attempts_2024_11_29;
DROP TABLE backup_dynamic_hints_2024_11_29;
```

---

## **🚨 EMERGENCY CONTACT**

If you get completely stuck:
1. **Don't panic!** Your data is backed up
2. **Restore from backup** using the commands above
3. **Check your application** - everything should be back to normal
4. **Try again** with smaller steps

---

## **💡 PRO TIPS**

- **Always test your app** after each change
- **Start small** - change one table at a time
- **Keep backups** until you're 100% confident
- **Use a staging/test environment** if you have one
- **Document what worked** so you can repeat it

**Remember: Better safe than sorry! 🛡️** 