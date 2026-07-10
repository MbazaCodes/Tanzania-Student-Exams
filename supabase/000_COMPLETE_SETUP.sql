-- ============================================================
-- ExamHub Tanzania — COMPLETE DATABASE SETUP (idempotent)
-- Run this ONE file in Supabase Dashboard → SQL Editor → New Query
-- Safe to run multiple times. Replaces running 001–008 separately.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ══════════════════════════════════════════════════════════
-- CORE TABLES
-- ══════════════════════════════════════════════════════════

create table if not exists schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null, code text, region text, district text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  role text not null default 'student',
  school_id uuid references schools(id) on delete set null,
  avatar_url text, bio text, phone text,
  created_at timestamptz not null default now()
);

-- Add all extended user columns (idempotent)
alter table users add column if not exists verification_status text default 'pending';
alter table users add column if not exists verified_at timestamptz;
alter table users add column if not exists verified_by uuid references users(id);
alter table users add column if not exists is_active boolean default true;
alter table users add column if not exists rejection_reason text;
alter table users add column if not exists school_name text;
alter table users add column if not exists region text;
alter table users add column if not exists district text;
alter table users add column if not exists teaching_levels text;
alter table users add column if not exists subjects_taught text;
alter table users add column if not exists is_premium boolean default false;
alter table users add column if not exists premium_rate numeric(10,2) default 0;
alter table users add column if not exists bio_public text;
alter table users add column if not exists rating numeric(3,2) default 0;
alter table users add column if not exists total_sessions int default 0;

-- role + verification_status constraints (drop old, add clean)
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('student','teacher','super_admin'));
alter table users drop constraint if exists users_verification_status_check;
alter table users add constraint users_verification_status_check
  check (verification_status in ('pending','approved','rejected','more_info'));

create index if not exists idx_users_role on users(role);
create index if not exists idx_users_email on users(email);

create table if not exists papers (
  id uuid primary key default uuid_generate_v4(),
  title text not null, subject text not null, level text not null, year int,
  type text default 'necta', status text default 'draft',
  file_name text, file_size bigint, file_url text, description text,
  uploaded_by_id uuid references users(id) on delete set null,
  school_id uuid references schools(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_papers_status on papers(status);
create index if not exists idx_papers_subject on papers(subject);

create table if not exists exams (
  id uuid primary key default uuid_generate_v4(),
  title text not null, subject text not null, level text not null,
  exam_type text default 'quiz', paper_id uuid references papers(id) on delete set null,
  duration_mins int default 60, total_marks int default 0, pass_mark int default 40,
  per_question_timer int, show_answer_after boolean default false,
  is_online boolean default false, instructions text,
  randomize_questions boolean default false, status text default 'draft',
  created_by_id uuid references users(id) on delete set null,
  school_id uuid references schools(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_exams_status on exams(status);
create index if not exists idx_exams_created_by on exams(created_by_id);

create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  type text not null default 'mcq', text text not null,
  options text default '[]', correct_answer text, explanation text,
  formula text, table_data text, graph_data text, image_url text,
  marks int default 1, difficulty text default 'medium',
  time_limit_secs int, "order" int default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_questions_exam on questions(exam_id);

create table if not exists submissions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  reviewed_by_id uuid references users(id) on delete set null,
  status text default 'submitted', score int default 0, grade text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists idx_submissions_exam on submissions(exam_id);
create index if not exists idx_submissions_student on submissions(student_id);

create table if not exists answers (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references submissions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer text, is_correct boolean, marks_awarded int default 0,
  feedback text
);
create index if not exists idx_answers_submission on answers(submission_id);

create table if not exists schedule_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null, type text default 'quiz', subject text, level text,
  scheduled_at timestamptz not null, duration_mins int default 30,
  status text default 'scheduled', exam_id uuid references exams(id) on delete set null,
  created_by_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_schedule_at on schedule_items(scheduled_at);

create table if not exists library_resources (
  id uuid primary key default uuid_generate_v4(),
  title text not null, type text default 'book', subject text not null, level text,
  author text, publisher text, year int, description text,
  file_url text, external_url text, cover_url text,
  is_free boolean default true, price_tzs numeric(10,2) default 0,
  status text default 'draft', download_count int default 0,
  contributed_by_id uuid references users(id) on delete set null,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists idx_library_subject on library_resources(subject);

create table if not exists verification_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null, school_name text, school_id uuid references schools(id),
  documents text, message text, status text default 'pending',
  reviewed_by uuid references users(id), reviewed_at timestamptz, review_note text,
  created_at timestamptz default now()
);
alter table verification_requests drop constraint if exists verification_requests_status_check;
alter table verification_requests add constraint verification_requests_status_check
  check (status in ('pending','approved','rejected','more_info'));
create index if not exists idx_verif_user on verification_requests(user_id, status);

create table if not exists user_credentials (
  user_id uuid primary key references users(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════════
-- FORUM TABLES
-- ══════════════════════════════════════════════════════════

create table if not exists forum_channels (
  id uuid primary key default uuid_generate_v4(),
  level text not null, subject text not null, description text,
  created_at timestamptz default now()
);
create unique index if not exists idx_forum_channel_ls on forum_channels(level, subject);

create table if not exists forum_topics (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references forum_channels(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  title text not null, body text not null,
  is_pinned boolean default false, is_locked boolean default false,
  views int default 0, reply_count int default 0,
  last_reply_at timestamptz default now(),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists idx_topic_channel on forum_topics(channel_id);

create table if not exists forum_posts (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references forum_topics(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  parent_id uuid references forum_posts(id) on delete set null,
  body text not null, image_url text, file_url text, file_name text,
  is_solution boolean default false, like_count int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists idx_post_topic on forum_posts(topic_id);

create table if not exists forum_likes (
  user_id uuid not null references users(id) on delete cascade,
  post_id uuid not null references forum_posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ══════════════════════════════════════════════════════════
-- SESSIONS + PAYMENTS TABLES
-- ══════════════════════════════════════════════════════════

create table if not exists online_sessions (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references users(id) on delete cascade,
  title text not null, description text, subject text not null, level text not null,
  session_type text default 'group', status text default 'scheduled',
  scheduled_at timestamptz not null, duration_mins int default 60, max_students int default 30,
  price_tzs numeric(10,2) default 0,
  is_free boolean generated always as (price_tzs = 0) stored,
  room_url text, recording_url text, enrolled_count int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists idx_session_teacher on online_sessions(teacher_id);

create table if not exists session_enrollments (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references online_sessions(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  payment_id uuid, status text default 'enrolled',
  enrolled_at timestamptz default now(),
  unique(session_id, student_id)
);

create table if not exists session_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references online_sessions(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text not null, type text default 'text', file_url text,
  created_at timestamptz default now()
);
create index if not exists idx_session_msg on session_messages(session_id, created_at);

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references users(id),
  teacher_id uuid references users(id),
  session_id uuid references online_sessions(id),
  amount_tzs numeric(10,2) not null, phone_number text not null,
  network text not null, reference text, lipa_namba text,
  status text default 'pending', description text,
  paid_at timestamptz, created_at timestamptz default now()
);
create index if not exists idx_payment_student on payments(student_id);

create table if not exists teacher_ratings (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  session_id uuid references online_sessions(id),
  rating int not null check (rating between 1 and 5), review text,
  created_at timestamptz default now(),
  unique(teacher_id, student_id, session_id)
);

-- ══════════════════════════════════════════════════════════
-- FUNCTIONS + TRIGGERS
-- ══════════════════════════════════════════════════════════

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- updated_at triggers (drop + recreate to be safe)
drop trigger if exists t_papers_upd on papers;
create trigger t_papers_upd before update on papers for each row execute procedure set_updated_at();
drop trigger if exists t_exams_upd on exams;
create trigger t_exams_upd before update on exams for each row execute procedure set_updated_at();
drop trigger if exists t_schedule_upd on schedule_items;
create trigger t_schedule_upd before update on schedule_items for each row execute procedure set_updated_at();
drop trigger if exists t_library_upd on library_resources;
create trigger t_library_upd before update on library_resources for each row execute procedure set_updated_at();
drop trigger if exists t_topic_upd on forum_topics;
create trigger t_topic_upd before update on forum_topics for each row execute procedure set_updated_at();
drop trigger if exists t_post_upd on forum_posts;
create trigger t_post_upd before update on forum_posts for each row execute procedure set_updated_at();
drop trigger if exists t_session_upd on online_sessions;
create trigger t_session_upd before update on online_sessions for each row execute procedure set_updated_at();

-- Forum like toggle
create or replace function toggle_forum_like(p_user_id uuid, p_post_id uuid)
returns table(liked boolean, like_count int) language plpgsql as $$
declare v_exists boolean; v_count int;
begin
  select exists(select 1 from forum_likes where user_id=p_user_id and post_id=p_post_id) into v_exists;
  if v_exists then
    delete from forum_likes where user_id=p_user_id and post_id=p_post_id;
    update forum_posts set like_count = like_count - 1 where id=p_post_id;
    liked := false;
  else
    insert into forum_likes(user_id, post_id) values(p_user_id, p_post_id);
    update forum_posts set like_count = like_count + 1 where id=p_post_id;
    liked := true;
  end if;
  select fp.like_count into v_count from forum_posts fp where fp.id=p_post_id;
  like_count := v_count; return next;
end $$;

create or replace function increment_topic_views(p_topic_id uuid)
returns void language sql as $$ update forum_topics set views = views + 1 where id = p_topic_id; $$;

create or replace function sync_topic_reply_stats() returns trigger language plpgsql as $$
begin
  if TG_OP='INSERT' then update forum_topics set reply_count=reply_count+1, last_reply_at=now() where id=new.topic_id;
  elsif TG_OP='DELETE' then update forum_topics set reply_count=greatest(reply_count-1,0) where id=old.topic_id; end if;
  return coalesce(new, old);
end $$;
drop trigger if exists t_post_sync on forum_posts;
create trigger t_post_sync after insert or delete on forum_posts for each row execute procedure sync_topic_reply_stats();

create or replace function sync_enrolled_count() returns trigger language plpgsql as $$
begin
  if TG_OP='INSERT' then update online_sessions set enrolled_count=enrolled_count+1 where id=new.session_id;
  elsif TG_OP='DELETE' then update online_sessions set enrolled_count=greatest(enrolled_count-1,0) where id=old.session_id; end if;
  return coalesce(new, old);
end $$;
drop trigger if exists t_enroll_count on session_enrollments;
create trigger t_enroll_count after insert or delete on session_enrollments for each row execute procedure sync_enrolled_count();

create or replace function enroll_in_session(p_student_id uuid, p_session_id uuid, p_payment_id uuid default null)
returns void language plpgsql as $$
begin
  insert into session_enrollments(session_id, student_id, payment_id)
  values (p_session_id, p_student_id, p_payment_id)
  on conflict (session_id, student_id) do nothing;
end $$;

create or replace function complete_payment(p_payment_id uuid, p_reference text)
returns void language plpgsql security definer as $$
declare v_payment payments%rowtype;
begin
  update payments set status='completed', reference=p_reference, paid_at=now()
  where id=p_payment_id returning * into v_payment;
  if v_payment.session_id is not null then
    perform enroll_in_session(v_payment.student_id, v_payment.session_id, p_payment_id);
  end if;
end $$;

create or replace function request_verification_info(p_user_id uuid, p_reviewer_id uuid, p_note text)
returns void language plpgsql security definer as $$
begin
  update verification_requests set status='more_info', reviewed_by=p_reviewer_id, reviewed_at=now(), review_note=p_note
  where user_id=p_user_id and status='pending';
  update users set verification_status='more_info' where id=p_user_id;
end $$;

-- ══════════════════════════════════════════════════════════
-- RLS — enable + policies (drop-then-create = idempotent)
-- ══════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array[
    'schools','users','papers','exams','questions','submissions','answers',
    'schedule_items','library_resources','verification_requests','user_credentials',
    'forum_channels','forum_topics','forum_posts','forum_likes',
    'online_sessions','session_enrollments','session_messages','payments','teacher_ratings'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public_read_%I" on %I', t, t);
    execute format('drop policy if exists "service_all_%I" on %I', t, t);
    execute format('create policy "public_read_%I" on %I for select using (true)', t, t);
    execute format('create policy "service_all_%I" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════
-- REALTIME (safe add — ignore if already added)
-- ══════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array[
    'submissions','schedule_items','exams','forum_topics','forum_posts','forum_likes',
    'online_sessions','session_messages','session_enrollments','payments'
  ] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; when others then null; end;
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ══════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit)
values ('exam-papers','exam-papers',true,26214400) on conflict (id) do update set public=true;
insert into storage.buckets (id, name, public, file_size_limit)
values ('forum-attachments','forum-attachments',true,10485760) on conflict (id) do update set public=true;
insert into storage.buckets (id, name, public, file_size_limit)
values ('library','library',true,52428800) on conflict (id) do update set public=true;
insert into storage.buckets (id, name, public, file_size_limit)
values ('session-resources','session-resources',true,52428800) on conflict (id) do update set public=true;

do $$
declare b text;
begin
  foreach b in array array['exam-papers','forum-attachments','library','session-resources'] loop
    execute format('drop policy if exists "read_%s" on storage.objects', b);
    execute format('drop policy if exists "write_%s" on storage.objects', b);
    execute format('create policy "read_%s" on storage.objects for select using (bucket_id = %L)', b, b);
    execute format('create policy "write_%s" on storage.objects for insert with check (bucket_id = %L)', b, b);
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════
-- SEED FORUM CHANNELS (structure, not data)
-- ══════════════════════════════════════════════════════════

insert into forum_channels (level, subject, description) values
  ('general','General','Open discussion for all ExamHub users'),
  ('standard_7','Mathematics','PSLE Mathematics'),
  ('standard_7','English','PSLE English'),
  ('standard_7','Science','Standard 7 Science'),
  ('form_2','Mathematics','Form 2 FTNA Mathematics'),
  ('form_2','Biology','Form 2 Biology'),
  ('form_2','Chemistry','Form 2 Chemistry'),
  ('form_2','Physics','Form 2 Physics'),
  ('form_2','English','Form 2 English'),
  ('form_4','Mathematics','CSEE Mathematics'),
  ('form_4','Biology','CSEE Biology'),
  ('form_4','Chemistry','CSEE Chemistry'),
  ('form_4','Physics','CSEE Physics'),
  ('form_4','English','CSEE English'),
  ('form_4','Geography','CSEE Geography'),
  ('form_4','History','CSEE History'),
  ('form_4','Civics','CSEE Civics'),
  ('form_4','Kiswahili','CSEE Kiswahili'),
  ('form_4','Commerce','CSEE Commerce'),
  ('form_4','Book-Keeping','CSEE Book-Keeping'),
  ('form_6','Mathematics','ACSEE Advanced Mathematics'),
  ('form_6','Physics','ACSEE Physics'),
  ('form_6','Chemistry','ACSEE Chemistry'),
  ('form_6','Biology','ACSEE Biology'),
  ('form_6','Geography','ACSEE Geography'),
  ('form_6','History','ACSEE History'),
  ('form_6','Economics','ACSEE Economics'),
  ('form_6','General Studies','ACSEE General Studies')
on conflict (level, subject) do nothing;

-- ══════════════════════════════════════════════════════════
-- ADMIN ACCOUNT
-- ══════════════════════════════════════════════════════════

insert into users (id, name, email, role, verification_status, is_active, verified_at)
values ('cdfc8267-1da3-4788-b526-40b593cb5ca8','ExamHub Admin','admin@tems.go.tz','super_admin','approved',true,now())
on conflict (id) do update set role='super_admin', verification_status='approved', is_active=true;

-- Admin password = "admin123" (base64). Change after first login.
insert into user_credentials (user_id, password_hash)
values ('cdfc8267-1da3-4788-b526-40b593cb5ca8', 'YWRtaW4xMjM=')
on conflict (user_id) do nothing;

-- ✅ DONE. Login: admin@tems.go.tz / admin123
