-- ============================================================
-- ExamHub Tanzania — New Features Migration
-- Run AFTER 001, 002, 003
-- ============================================================

-- ─── ALTER users: add verification + is_active ───────────────
alter table users add column if not exists verification_status text default 'pending'
  check (verification_status in ('pending','approved','rejected'));
alter table users add column if not exists verified_at timestamptz;
alter table users add column if not exists verified_by uuid references users(id);
alter table users add column if not exists is_active boolean default true;
alter table users add column if not exists rejection_reason text;
alter table users add column if not exists phone text;
alter table users add column if not exists bio text;
alter table users add column if not exists avatar_url text;

-- Students are auto-approved, teachers/school_admins require verification
-- Set existing students to approved
update users set verification_status = 'approved', verified_at = now()
where role = 'student' and verification_status = 'pending';

-- Grant admin@tems.go.tz super_admin permanently
update users set
  role = 'super_admin',
  verification_status = 'approved',
  verified_at = now(),
  is_active = true
where email = 'admin@tems.go.tz';

-- Also set by UID
update users set
  role = 'super_admin',
  verification_status = 'approved',
  verified_at = now(),
  is_active = true
where id = 'cdfc8267-1da3-4788-b526-40b593cb5ca8';

-- ─── ALTER questions: add formula, table, graph, image ────────
alter table questions add column if not exists formula text;
alter table questions add column if not exists table_data text;   -- JSON
alter table questions add column if not exists graph_data text;   -- JSON
alter table questions add column if not exists image_url text;

-- Update question type check to include new types
alter table questions drop constraint if exists questions_type_check;
alter table questions add constraint questions_type_check
  check (type in ('mcq','truefalse','short','essay','formula','table','graph'));

-- ─── ALTER exams: add instructions, pass_mark, randomize ─────
alter table exams add column if not exists instructions text;
alter table exams add column if not exists pass_mark int default 40;
alter table exams add column if not exists randomize_questions boolean default false;

-- ─── LIBRARY RESOURCES ───────────────────────────────────────
create table if not exists library_resources (
  id                uuid primary key default uuid_generate_v4(),
  title             text not null,
  description       text,
  type              text not null default 'book'
                      check (type in ('book','notes','video','article','past_paper','syllabus')),
  subject           text not null,
  level             text check (level in ('standard_4','standard_7','form_2','form_4','form_6')),
  file_url          text,
  file_name         text,
  file_size         int,
  cover_url         text,
  external_url      text,
  author            text,
  publisher         text,
  year              int,
  is_free           boolean default true,
  status            text not null default 'draft' check (status in ('draft','published')),
  contributed_by_id uuid not null references users(id),
  school_id         uuid references schools(id) on delete set null,
  download_count    int not null default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists idx_library_subject on library_resources(subject);
create index if not exists idx_library_level   on library_resources(level);
create index if not exists idx_library_type    on library_resources(type);
create index if not exists idx_library_status  on library_resources(status);

do $$ begin
  create trigger t_library_upd before update on library_resources
    for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;

alter table library_resources enable row level security;
create policy "public_read_published_library" on library_resources
  for select using (status = 'published');
create policy "service_all_library" on library_resources
  for all using (true) with check (true);

-- ─── VERIFICATION REQUESTS ───────────────────────────────────
create table if not exists verification_requests (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  role        text not null,
  school_name text,
  school_id   uuid references schools(id),
  documents   text,  -- JSON array of document URLs
  message     text,
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz default now()
);

create index if not exists idx_verif_user_id on verification_requests(user_id);
create index if not exists idx_verif_status  on verification_requests(status);

alter table verification_requests enable row level security;
create policy "service_all_verif" on verification_requests
  for all using (true) with check (true);

-- ─── FUNCTION: approve teacher/school ────────────────────────
create or replace function approve_user_verification(
  p_user_id uuid,
  p_reviewer_id uuid,
  p_note text default null
) returns void language plpgsql security definer as $$
begin
  update users set
    verification_status = 'approved',
    verified_at = now(),
    verified_by = p_reviewer_id,
    is_active = true
  where id = p_user_id;

  update verification_requests set
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    review_note = p_note
  where user_id = p_user_id and status = 'pending';
end;
$$;

create or replace function reject_user_verification(
  p_user_id uuid,
  p_reviewer_id uuid,
  p_reason text
) returns void language plpgsql security definer as $$
begin
  update users set
    verification_status = 'rejected',
    rejection_reason = p_reason,
    is_active = false
  where id = p_user_id;

  update verification_requests set
    status = 'rejected',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    review_note = p_reason
  where user_id = p_user_id and status = 'pending';
end;
$$;

-- ─── Storage bucket for library ──────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library',
  'library',
  true,
  104857600,  -- 100MB for books
  array['application/pdf','application/epub+zip','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg','image/png','image/webp','video/mp4']
)
on conflict (id) do update set public = true, file_size_limit = 104857600;

create policy "public_read_library_files" on storage.objects
  for select using (bucket_id = 'library');
create policy "auth_upload_library_files" on storage.objects
  for insert with check (bucket_id = 'library');
create policy "auth_delete_library_files" on storage.objects
  for delete using (bucket_id = 'library');

-- ─── Realtime for verification requests ──────────────────────
alter publication supabase_realtime add table verification_requests;
alter publication supabase_realtime add table library_resources;
alter publication supabase_realtime add table users;

