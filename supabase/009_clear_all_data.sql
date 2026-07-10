-- ============================================================
-- ExamHub Tanzania — CLEAR ALL DATA (fresh start)
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ⚠️  This DELETES all papers, exams, submissions, forum posts,
--     sessions, payments — but KEEPS the schema and the admin account.
-- ============================================================

-- Disable triggers temporarily to avoid FK cascade noise
set session_replication_role = 'replica';

-- Delete in dependency order
truncate table
  answers,
  submissions,
  questions,
  schedule_items,
  forum_likes,
  forum_posts,
  forum_topics,
  session_messages,
  session_enrollments,
  teacher_ratings,
  payments,
  online_sessions,
  library_resources,
  verification_requests,
  exams,
  papers
restart identity cascade;

-- Re-enable triggers
set session_replication_role = 'origin';

-- Delete all users EXCEPT the admin
delete from user_credentials
  where user_id not in (
    select id from users where email = 'admin@tems.go.tz'
  );

delete from users where email <> 'admin@tems.go.tz';

-- Reset admin to clean state
update users set
  role = 'super_admin',
  verification_status = 'approved',
  is_active = true,
  verified_at = now(),
  rating = 0,
  total_sessions = 0,
  is_premium = false
where email = 'admin@tems.go.tz';

-- Keep forum channels (they are structure, not data) — but reset any counts
update forum_topics set reply_count = 0, views = 0 where true;

-- Done — app now starts fresh with only the admin account
-- Everything else (papers, exams, forum posts, sessions) is empty
-- Teachers and students register fresh, teachers post real content
