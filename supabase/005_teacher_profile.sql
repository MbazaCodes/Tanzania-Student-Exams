-- ============================================================
-- ExamHub Tanzania — Teacher Profile Columns
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add teacher profile columns to users table
alter table users add column if not exists phone            text;
alter table users add column if not exists school_name      text;
alter table users add column if not exists region           text;
alter table users add column if not exists district         text;
alter table users add column if not exists teaching_levels  text;  -- JSON array e.g. '["Form 4","Form 6"]'
alter table users add column if not exists subjects_taught  text;  -- JSON array e.g. '["Mathematics","Physics"]'

-- Grant admin@tems.go.tz super_admin (safe to run again)
update users set
  role = 'super_admin',
  verification_status = 'approved',
  verified_at = now(),
  is_active = true
where email = 'admin@tems.go.tz'
   or id    = 'cdfc8267-1da3-4788-b526-40b593cb5ca8';

-- Migrate any existing school_admin → teacher
update users set role = 'teacher'
where role = 'school_admin';

-- Auto-approve all students
update users set
  verification_status = 'approved',
  verified_at = now()
where role = 'student'
  and (verification_status is null or verification_status = 'pending');
