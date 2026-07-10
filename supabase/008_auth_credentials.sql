-- ============================================================
-- ExamHub Tanzania — Custom Auth (no Supabase Auth required)
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- User credentials table (stores password hash for direct login)
create table if not exists user_credentials (
  user_id       uuid primary key references users(id) on delete cascade,
  password_hash text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table user_credentials enable row level security;
create policy "service_all_credentials" on user_credentials
  for all using (true) with check (true);

-- Ensure users.verification_status has correct check constraint
alter table users drop constraint if exists users_verification_status_check;
alter table users add constraint users_verification_status_check
  check (verification_status in ('pending','approved','rejected','more_info'));

-- Auto-approve admin
update users set
  role = 'super_admin',
  verification_status = 'approved',
  is_active = true,
  verified_at = now()
where email = 'admin@tems.go.tz'
   or id = 'cdfc8267-1da3-4788-b526-40b593cb5ca8';

-- Auto-approve all students
update users set
  verification_status = 'approved',
  is_active = true
where role = 'student'
  and (verification_status is null or verification_status = 'pending');
