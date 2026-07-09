-- ============================================================
-- ExamHub Tanzania — Supabase Storage Setup
-- Run in Supabase Dashboard → SQL Editor AFTER 001_schema.sql
-- ============================================================

-- Create exam-papers storage bucket (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-papers',
  'exam-papers',
  true,
  26214400,  -- 25MB limit
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 26214400;

-- Storage RLS policies
drop policy if exists "public_read_exam_papers"   on storage.objects;
drop policy if exists "auth_upload_exam_papers"   on storage.objects;
drop policy if exists "owner_delete_exam_papers"  on storage.objects;

create policy "public_read_exam_papers" on storage.objects
  for select using (bucket_id = 'exam-papers');

create policy "auth_upload_exam_papers" on storage.objects
  for insert with check (bucket_id = 'exam-papers');

create policy "auth_update_exam_papers" on storage.objects
  for update using (bucket_id = 'exam-papers');

create policy "auth_delete_exam_papers" on storage.objects
  for delete using (bucket_id = 'exam-papers');

