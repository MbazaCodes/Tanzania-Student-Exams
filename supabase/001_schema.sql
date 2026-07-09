-- ============================================================
-- ExamHub Tanzania — Complete Supabase Schema
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- for fast text search

-- ─── SCHOOLS ─────────────────────────────────────────────────
create table if not exists schools (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  region     text not null,
  plan       text not null default 'free'  check (plan in ('free','premium','enterprise')),
  logo_url   text,
  created_at timestamptz not null default now()
);
create index if not exists idx_schools_region on schools(region);

-- ─── USERS ───────────────────────────────────────────────────
-- id matches auth.users.id so Supabase Auth works seamlessly
create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text unique not null,
  role          text not null default 'student'
                  check (role in ('student','teacher','school_admin','super_admin')),
  teacher_type  text check (teacher_type in ('school','independent')),
  school_id     uuid references schools(id) on delete set null,
  avatar_url    text,
  bio           text,
  phone         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_users_role      on users(role);
create index if not exists idx_users_school_id on users(school_id);
create index if not exists idx_users_email     on users(email);

-- ─── PAPERS ──────────────────────────────────────────────────
create table if not exists papers (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  subject         text not null,
  level           text not null
                    check (level in ('standard_4','standard_7','form_2','form_4','form_6')),
  year            int  not null check (year between 1990 and 2030),
  type            text not null default 'necta'
                    check (type in ('necta','mock','school','regional','pre_national')),
  status          text not null default 'draft'
                    check (status in ('draft','published','archived')),
  file_name       text,
  file_size       int  check (file_size > 0),
  file_url        text,           -- Supabase Storage public URL
  file_path       text,           -- Supabase Storage path for deletion
  description     text,
  uploaded_by_id  uuid not null references users(id),
  school_id       uuid references schools(id) on delete set null,
  download_count  int  not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_papers_subject   on papers(subject);
create index if not exists idx_papers_level     on papers(level);
create index if not exists idx_papers_status    on papers(status);
create index if not exists idx_papers_school_id on papers(school_id);
create index if not exists idx_papers_year      on papers(year);
-- Full-text search index
create index if not exists idx_papers_title_trgm on papers using gin (title gin_trgm_ops);

-- ─── EXAMS ───────────────────────────────────────────────────
create table if not exists exams (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  subject             text not null,
  level               text not null
                        check (level in ('standard_4','standard_7','form_2','form_4','form_6')),
  exam_type           text not null default 'exam'
                        check (exam_type in ('exam','quiz','daily_quiz','assignment')),
  duration_mins       int  not null default 60 check (duration_mins > 0),
  per_question_timer  int  check (per_question_timer > 0),
  total_marks         int  not null default 0,
  pass_mark           int  default 40,
  status              text not null default 'draft'
                        check (status in ('draft','published','closed')),
  description         text,
  instructions        text,
  paper_id            uuid unique references papers(id) on delete set null,
  created_by_id       uuid not null references users(id),
  school_id           uuid references schools(id) on delete set null,
  is_online           boolean not null default false,
  show_answer_after   boolean not null default true,
  randomize_questions boolean not null default false,
  allow_retakes       boolean not null default false,
  max_attempts        int  default 1,
  available_from      timestamptz,
  available_until     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_exams_status       on exams(status);
create index if not exists idx_exams_subject      on exams(subject);
create index if not exists idx_exams_level        on exams(level);
create index if not exists idx_exams_school_id    on exams(school_id);
create index if not exists idx_exams_created_by   on exams(created_by_id);
create index if not exists idx_exams_exam_type    on exams(exam_type);

-- ─── QUESTIONS ───────────────────────────────────────────────
create table if not exists questions (
  id              uuid primary key default uuid_generate_v4(),
  exam_id         uuid not null references exams(id) on delete cascade,
  type            text not null
                    check (type in ('mcq','truefalse','short','essay')),
  text            text not null,
  options         text not null default '[]',
  correct_answer  text not null default '',
  explanation     text,
  marks           int  not null default 1 check (marks > 0),
  difficulty      text not null default 'medium'
                    check (difficulty in ('easy','medium','hard')),
  time_limit_secs int  check (time_limit_secs > 0),
  image_url       text,
  "order"         int  not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_questions_exam_id on questions(exam_id);
create index if not exists idx_questions_order   on questions(exam_id, "order");

-- ─── SUBMISSIONS ─────────────────────────────────────────────
create table if not exists submissions (
  id              uuid primary key default uuid_generate_v4(),
  exam_id         uuid not null references exams(id) on delete restrict,
  student_id      uuid not null references users(id) on delete restrict,
  score           int,
  percentage      float check (percentage between 0 and 100),
  grade           text  check (grade in ('A','B','C','D','F')),
  status          text not null default 'submitted'
                    check (status in ('submitted','auto_marked','reviewed','published')),
  reviewed_by_id  uuid references users(id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz not null default now(),
  time_taken_mins int,
  attempt_number  int  not null default 1,
  created_at      timestamptz not null default now()
);
create index if not exists idx_submissions_exam_id    on submissions(exam_id);
create index if not exists idx_submissions_student_id on submissions(student_id);
create index if not exists idx_submissions_status     on submissions(status);
create index if not exists idx_submissions_submitted  on submissions(submitted_at desc);
-- Prevent duplicate submissions (unless allow_retakes=true, handled in app)
create unique index if not exists idx_submissions_unique
  on submissions(exam_id, student_id, attempt_number);

-- ─── ANSWERS ─────────────────────────────────────────────────
create table if not exists answers (
  id              uuid primary key default uuid_generate_v4(),
  submission_id   uuid not null references submissions(id) on delete cascade,
  question_id     uuid not null references questions(id) on delete cascade,
  answer          text not null default '',
  is_correct      boolean,
  marks_awarded   int  not null default 0,
  feedback        text,
  time_taken_secs int  check (time_taken_secs >= 0),
  created_at      timestamptz not null default now()
);
create index if not exists idx_answers_submission_id on answers(submission_id);
create index if not exists idx_answers_question_id   on answers(question_id);

-- ─── SCHEDULE ITEMS ──────────────────────────────────────────
create table if not exists schedule_items (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  type            text not null
                    check (type in ('quiz_of_day','exam','test','assignment')),
  subject         text not null,
  level           text,
  description     text,
  scheduled_at    timestamptz not null,
  duration_mins   int  not null default 60,
  status          text not null default 'scheduled'
                    check (status in ('scheduled','live','completed','cancelled')),
  exam_id         uuid references exams(id) on delete set null,
  created_by_id   uuid not null references users(id),
  school_id       uuid references schools(id) on delete set null,
  notify_students boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_schedule_scheduled_at on schedule_items(scheduled_at);
create index if not exists idx_schedule_school_id    on schedule_items(school_id);
create index if not exists idx_schedule_status       on schedule_items(status);

-- ─── TRIGGERS — updated_at ───────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  create trigger t_papers_upd    before update on papers         for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger t_exams_upd     before update on exams          for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger t_schedule_upd  before update on schedule_items for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;

-- ─── FUNCTION — search papers ────────────────────────────────
create or replace function search_papers(query text, lim int default 20)
returns setof papers language sql stable as $$
  select * from papers
  where status = 'published'
    and (title ilike '%' || query || '%' or subject ilike '%' || query || '%')
  order by download_count desc, created_at desc
  limit lim;
$$;

-- ─── FUNCTION — student summary ──────────────────────────────
create or replace function get_student_summary(p_student_id uuid)
returns table(
  total_exams bigint, avg_score float, best_score float,
  total_marks_earned bigint, subjects_attempted text[]
) language sql stable as $$
  select
    count(*),
    avg(percentage),
    max(percentage),
    sum(score),
    array_agg(distinct e.subject)
  from submissions s
  join exams e on e.id = s.exam_id
  where s.student_id = p_student_id
    and s.status = 'published';
$$;

-- ─── REALTIME — enable on key tables ─────────────────────────
alter publication supabase_realtime add table submissions;
alter publication supabase_realtime add table schedule_items;
alter publication supabase_realtime add table exams;

-- ─── STORAGE — create bucket (run separately if needed) ──────
-- insert into storage.buckets (id, name, public)
-- values ('exam-papers', 'exam-papers', true)
-- on conflict (id) do nothing;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table schools        enable row level security;
alter table users          enable row level security;
alter table papers         enable row level security;
alter table exams          enable row level security;
alter table questions      enable row level security;
alter table submissions    enable row level security;
alter table answers        enable row level security;
alter table schedule_items enable row level security;

-- Drop existing policies first to avoid conflicts
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ── Public READ ──────────────────────────────────────────────
create policy "public_read_schools"        on schools        for select using (true);
create policy "public_read_users"          on users          for select using (true);
create policy "public_read_published_papers" on papers       for select using (status = 'published');
create policy "public_read_published_exams"  on exams        for select using (status = 'published');
create policy "public_read_questions"      on questions      for select using (true);
create policy "public_read_schedule"       on schedule_items for select using (true);

-- ── Authenticated user can read own submissions ───────────────
create policy "student_read_own_submissions" on submissions
  for select using (student_id = (select id from users where email = auth.jwt()->>'email' limit 1));

create policy "student_read_own_answers" on answers
  for select using (
    submission_id in (
      select id from submissions
      where student_id = (select id from users where email = auth.jwt()->>'email' limit 1)
    )
  );

-- ── Service role (anon bypass for our admin client) ───────────
-- These policies allow our supabaseAdmin client (service role) to do anything
create policy "service_all_schools"        on schools        for all using (true) with check (true);
create policy "service_all_users"          on users          for all using (true) with check (true);
create policy "service_all_papers"         on papers         for all using (true) with check (true);
create policy "service_all_exams"          on exams          for all using (true) with check (true);
create policy "service_all_questions"      on questions      for all using (true) with check (true);
create policy "service_all_submissions"    on submissions    for all using (true) with check (true);
create policy "service_all_answers"        on answers        for all using (true) with check (true);
create policy "service_all_schedule"       on schedule_items for all using (true) with check (true);

