-- ExamHub Tanzania — Supabase Schema
-- Run in Supabase SQL Editor → New Query

create extension if not exists "uuid-ossp";

create table if not exists schools (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  region     text not null,
  plan       text not null default 'free',
  created_at timestamptz default now()
);

create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text unique not null,
  role          text not null default 'student',
  teacher_type  text,
  school_id     uuid references schools(id),
  created_at    timestamptz default now()
);

create table if not exists papers (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  subject         text not null,
  level           text not null,
  year            int  not null,
  type            text not null default 'necta',
  status          text not null default 'draft',
  file_name       text,
  file_size       int,
  description     text,
  uploaded_by_id  uuid not null references users(id),
  school_id       uuid references schools(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists exams (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  subject             text not null,
  level               text not null,
  exam_type           text not null default 'exam',
  duration_mins       int  not null default 60,
  per_question_timer  int,
  total_marks         int  not null default 0,
  status              text not null default 'draft',
  description         text,
  paper_id            uuid unique references papers(id),
  created_by_id       uuid not null references users(id),
  school_id           uuid references schools(id),
  is_online           boolean not null default false,
  show_answer_after   boolean not null default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists questions (
  id              uuid primary key default uuid_generate_v4(),
  exam_id         uuid not null references exams(id) on delete cascade,
  type            text not null,
  text            text not null,
  options         text not null default '[]',
  correct_answer  text not null,
  explanation     text,
  marks           int  not null default 1,
  difficulty      text not null default 'medium',
  time_limit_secs int,
  "order"         int  not null default 0,
  created_at      timestamptz default now()
);

create table if not exists submissions (
  id              uuid primary key default uuid_generate_v4(),
  exam_id         uuid not null references exams(id),
  student_id      uuid not null references users(id),
  score           int,
  percentage      float,
  grade           text,
  status          text not null default 'submitted',
  reviewed_by_id  uuid references users(id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz default now(),
  created_at      timestamptz default now()
);

create table if not exists answers (
  id              uuid primary key default uuid_generate_v4(),
  submission_id   uuid not null references submissions(id) on delete cascade,
  question_id     uuid not null references questions(id),
  answer          text not null,
  is_correct      boolean,
  marks_awarded   int  not null default 0,
  feedback        text,
  time_taken_secs int,
  created_at      timestamptz default now()
);

create table if not exists schedule_items (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  type            text not null,
  subject         text not null,
  level           text,
  description     text,
  scheduled_at    timestamptz not null,
  duration_mins   int  not null default 60,
  status          text not null default 'scheduled',
  exam_id         uuid references exams(id),
  created_by_id   uuid not null references users(id),
  school_id       uuid references schools(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- updated_at trigger
create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
do $$ begin create trigger t_papers_upd before update on papers for each row execute procedure set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger t_exams_upd  before update on exams  for each row execute procedure set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger t_sched_upd  before update on schedule_items for each row execute procedure set_updated_at(); exception when duplicate_object then null; end $$;

-- RLS
alter table schools        enable row level security;
alter table users          enable row level security;
alter table papers         enable row level security;
alter table exams          enable row level security;
alter table questions      enable row level security;
alter table submissions    enable row level security;
alter table answers        enable row level security;
alter table schedule_items enable row level security;

do $$ begin
  create policy "allow_all_schools"   on schools        for all using (true);
  create policy "allow_all_users"     on users          for all using (true);
  create policy "allow_all_papers"    on papers         for all using (true);
  create policy "allow_all_exams"     on exams          for all using (true);
  create policy "allow_all_questions" on questions      for all using (true);
  create policy "allow_all_subs"      on submissions    for all using (true);
  create policy "allow_all_answers"   on answers        for all using (true);
  create policy "allow_all_schedule"  on schedule_items for all using (true);
exception when duplicate_object then null; end $$;
