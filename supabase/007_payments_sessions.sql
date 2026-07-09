-- ============================================================
-- ExamHub Tanzania — Payments, Online Sessions, Fix Verifications
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── FIX: Add unique constraint to verification_requests.user_id ──
-- (needed for upsert to work reliably)
alter table verification_requests
  drop constraint if exists verification_requests_user_id_key;

-- Use unique index instead (allows multiple per user over time — we delete+insert)
drop index if exists idx_verif_user_id;
create index if not exists idx_verif_user_id on verification_requests(user_id, status);

-- ─── TEACHER PREMIUM PROFILES ────────────────────────────────
alter table users add column if not exists is_premium     boolean default false;
alter table users add column if not exists premium_rate   numeric(10,2) default 0;   -- TZS per session/hour
alter table users add column if not exists bio_public     text;
alter table users add column if not exists rating         numeric(3,2) default 0;
alter table users add column if not exists total_sessions int default 0;

-- ─── ONLINE SESSIONS ─────────────────────────────────────────
create table if not exists online_sessions (
  id              uuid primary key default uuid_generate_v4(),
  teacher_id      uuid not null references users(id) on delete cascade,
  title           text not null,
  description     text,
  subject         text not null,
  level           text not null,
  session_type    text not null default 'group'  -- 'group' | 'private'
                    check (session_type in ('group','private')),
  status          text not null default 'scheduled'
                    check (status in ('scheduled','live','ended','cancelled')),
  scheduled_at    timestamptz not null,
  duration_mins   int not null default 60,
  max_students    int default 30,
  price_tzs       numeric(10,2) not null default 0,  -- 0 = free
  is_free         boolean generated always as (price_tzs = 0) stored,
  room_url        text,   -- Jitsi Meet / Daily.co URL
  recording_url   text,
  enrolled_count  int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_session_teacher    on online_sessions(teacher_id);
create index if not exists idx_session_status     on online_sessions(status);
create index if not exists idx_session_scheduled  on online_sessions(scheduled_at);
create index if not exists idx_session_subject    on online_sessions(subject, level);

do $$ begin create trigger t_session_upd before update on online_sessions
  for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;

-- ─── SESSION ENROLLMENTS ─────────────────────────────────────
create table if not exists session_enrollments (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid not null references online_sessions(id) on delete cascade,
  student_id      uuid not null references users(id) on delete cascade,
  payment_id      uuid,  -- references payment if paid
  status          text not null default 'enrolled'
                    check (status in ('enrolled','attended','cancelled')),
  enrolled_at     timestamptz default now(),
  unique(session_id, student_id)
);
create index if not exists idx_enrollment_session on session_enrollments(session_id);
create index if not exists idx_enrollment_student on session_enrollments(student_id);

-- Trigger: update enrolled_count
create or replace function sync_enrolled_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update online_sessions set enrolled_count = enrolled_count + 1 where id = new.session_id;
  elsif TG_OP = 'DELETE' then
    update online_sessions set enrolled_count = greatest(enrolled_count - 1, 0) where id = old.session_id;
  end if;
  return coalesce(new, old);
end;
$$;
do $$ begin create trigger t_enroll_count after insert or delete on session_enrollments
  for each row execute procedure sync_enrolled_count();
exception when duplicate_object then null; end $$;

-- ─── SESSION CHAT ─────────────────────────────────────────────
create table if not exists session_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references online_sessions(id) on delete cascade,
  sender_id   uuid not null references users(id) on delete cascade,
  body        text not null,
  type        text default 'text' check (type in ('text','image','file','system')),
  file_url    text,
  created_at  timestamptz default now()
);
create index if not exists idx_session_msg_session on session_messages(session_id, created_at);

-- ─── PAYMENTS ─────────────────────────────────────────────────
create table if not exists payments (
  id              uuid primary key default uuid_generate_v4(),
  student_id      uuid not null references users(id),
  teacher_id      uuid references users(id),
  session_id      uuid references online_sessions(id),
  amount_tzs      numeric(10,2) not null,
  phone_number    text not null,   -- M-Pesa/Tigo/Airtel number
  network         text not null    -- 'mpesa'|'tigopesa'|'airtel'|'halopesa'
                    check (network in ('mpesa','tigopesa','airtel','halopesa')),
  reference       text,            -- operator transaction reference
  lipa_namba      text,            -- business till / lipa namba
  status          text not null default 'pending'
                    check (status in ('pending','processing','completed','failed','refunded')),
  description     text,
  paid_at         timestamptz,
  created_at      timestamptz default now()
);
create index if not exists idx_payment_student   on payments(student_id);
create index if not exists idx_payment_teacher   on payments(teacher_id);
create index if not exists idx_payment_status    on payments(status);
create index if not exists idx_payment_session   on payments(session_id);

-- ─── TEACHER RATINGS ─────────────────────────────────────────
create table if not exists teacher_ratings (
  id          uuid primary key default uuid_generate_v4(),
  teacher_id  uuid not null references users(id) on delete cascade,
  student_id  uuid not null references users(id) on delete cascade,
  session_id  uuid references online_sessions(id),
  rating      int not null check (rating between 1 and 5),
  review      text,
  created_at  timestamptz default now(),
  unique(teacher_id, student_id, session_id)
);
create index if not exists idx_rating_teacher on teacher_ratings(teacher_id);

-- Trigger: update teacher avg rating
create or replace function sync_teacher_rating()
returns trigger language plpgsql as $$
begin
  update users set
    rating = (select round(avg(rating)::numeric, 2) from teacher_ratings where teacher_id = new.teacher_id),
    total_sessions = (select count(distinct session_id) from session_enrollments se join online_sessions os on os.id = se.session_id where os.teacher_id = new.teacher_id)
  where id = new.teacher_id;
  return new;
end;
$$;
do $$ begin create trigger t_sync_rating after insert or update on teacher_ratings
  for each row execute procedure sync_teacher_rating();
exception when duplicate_object then null; end $$;

-- ─── FUNCTION: enroll student in session ─────────────────────
create or replace function enroll_in_session(p_student_id uuid, p_session_id uuid, p_payment_id uuid default null)
returns void language plpgsql as $$
begin
  insert into session_enrollments(session_id, student_id, payment_id)
  values (p_session_id, p_student_id, p_payment_id)
  on conflict (session_id, student_id) do nothing;
end;
$$;

-- ─── FUNCTION: mark payment completed ────────────────────────
create or replace function complete_payment(p_payment_id uuid, p_reference text)
returns void language plpgsql security definer as $$
declare v_payment payments%rowtype;
begin
  update payments set status = 'completed', reference = p_reference, paid_at = now()
  where id = p_payment_id returning * into v_payment;
  -- auto-enroll
  if v_payment.session_id is not null then
    perform enroll_in_session(v_payment.student_id, v_payment.session_id, p_payment_id);
  end if;
end;
$$;

-- ─── FUNCTION: simulate Lipa Namba payment (demo) ────────────
create or replace function initiate_lipa_payment(
  p_student_id uuid, p_session_id uuid,
  p_phone text, p_network text, p_amount numeric
) returns uuid language plpgsql as $$
declare
  v_session online_sessions%rowtype;
  v_payment_id uuid;
begin
  select * into v_session from online_sessions where id = p_session_id;
  -- Create payment record
  insert into payments(student_id, teacher_id, session_id, amount_tzs, phone_number, network,
    lipa_namba, description, status)
  values (p_student_id, v_session.teacher_id, p_session_id, p_amount, p_phone, p_network,
    '123456', 'ExamHub Session: ' || v_session.title, 'pending')
  returning id into v_payment_id;
  return v_payment_id;
end;
$$;

-- ─── FUNCTION: request more info for verification ─────────────
create or replace function request_verification_info(
  p_user_id uuid, p_reviewer_id uuid, p_note text
) returns void language plpgsql security definer as $$
begin
  update verification_requests set
    status = 'more_info',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    review_note = p_note
  where user_id = p_user_id and status = 'pending';

  update users set verification_status = 'more_info' where id = p_user_id;
end;
$$;

-- Add 'more_info' status to verification_requests
alter table verification_requests
  drop constraint if exists verification_requests_status_check;
alter table verification_requests
  add constraint verification_requests_status_check
  check (status in ('pending','approved','rejected','more_info'));

-- Add 'more_info' status to users.verification_status
alter table users
  drop constraint if exists users_verification_status_check;
alter table users
  add constraint users_verification_status_check
  check (verification_status in ('pending','approved','rejected','more_info'));

-- ─── RLS ─────────────────────────────────────────────────────
alter table online_sessions     enable row level security;
alter table session_enrollments enable row level security;
alter table session_messages    enable row level security;
alter table payments            enable row level security;
alter table teacher_ratings     enable row level security;

create policy "public_read_sessions"     on online_sessions     for select using (true);
create policy "public_read_enrollments"  on session_enrollments for select using (true);
create policy "public_read_messages"     on session_messages    for select using (true);
create policy "public_read_ratings"      on teacher_ratings     for select using (true);
create policy "service_all_sessions"     on online_sessions     for all using (true) with check (true);
create policy "service_all_enrollments"  on session_enrollments for all using (true) with check (true);
create policy "service_all_messages"     on session_messages    for all using (true) with check (true);
create policy "service_all_payments"     on payments            for all using (true) with check (true);
create policy "service_all_ratings"      on teacher_ratings     for all using (true) with check (true);

-- ─── REALTIME ─────────────────────────────────────────────────
alter publication supabase_realtime add table online_sessions;
alter publication supabase_realtime add table session_messages;
alter publication supabase_realtime add table session_enrollments;
alter publication supabase_realtime add table payments;

-- ─── STORAGE: session recordings / resources ─────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('session-resources', 'session-resources', true, 52428800)
on conflict (id) do update set public = true;

create policy "public_read_session_resources" on storage.objects
  for select using (bucket_id = 'session-resources');
create policy "auth_upload_session_resources" on storage.objects
  for insert with check (bucket_id = 'session-resources');
