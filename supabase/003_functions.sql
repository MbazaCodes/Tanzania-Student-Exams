-- ============================================================
-- ExamHub Tanzania — Database Functions & Triggers
-- Run AFTER 001_schema.sql and 002_storage.sql
-- ============================================================

-- ─── FUNCTION: auto-calculate exam total_marks ───────────────
-- Keeps exams.total_marks in sync whenever questions change
create or replace function sync_exam_total_marks()
returns trigger language plpgsql as $$
declare
  v_total int;
  v_exam_id uuid;
begin
  v_exam_id := coalesce(new.exam_id, old.exam_id);
  select coalesce(sum(marks), 0) into v_total
  from questions where exam_id = v_exam_id;
  update exams set total_marks = v_total where id = v_exam_id;
  return new;
end;
$$;

do $$ begin
  create trigger t_questions_sync_marks
    after insert or update or delete on questions
    for each row execute procedure sync_exam_total_marks();
exception when duplicate_object then null; end $$;

-- ─── FUNCTION: increment paper download count ─────────────────
create or replace function increment_download(p_paper_id uuid)
returns void language sql as $$
  update papers set download_count = download_count + 1 where id = p_paper_id;
$$;

-- ─── FUNCTION: get leaderboard for an exam ───────────────────
create or replace function exam_leaderboard(p_exam_id uuid, p_limit int default 10)
returns table(
  rank bigint,
  student_name text,
  student_id uuid,
  score int,
  percentage float,
  grade text,
  submitted_at timestamptz,
  time_taken_mins int
) language sql stable as $$
  select
    rank() over (order by s.percentage desc, s.submitted_at asc),
    u.name,
    s.student_id,
    s.score,
    s.percentage,
    s.grade,
    s.submitted_at,
    s.time_taken_mins
  from submissions s
  join users u on u.id = s.student_id
  where s.exam_id = p_exam_id
    and s.status in ('auto_marked', 'reviewed', 'published')
  order by s.percentage desc, s.submitted_at asc
  limit p_limit;
$$;

-- ─── FUNCTION: get student performance by subject ────────────
create or replace function student_subject_stats(p_student_id uuid)
returns table(
  subject text,
  attempts bigint,
  avg_score float,
  best_score float,
  last_attempt timestamptz
) language sql stable as $$
  select
    e.subject,
    count(*),
    avg(s.percentage),
    max(s.percentage),
    max(s.submitted_at)
  from submissions s
  join exams e on e.id = s.exam_id
  where s.student_id = p_student_id
  group by e.subject
  order by count(*) desc;
$$;

-- ─── FUNCTION: get teacher's exam stats ──────────────────────
create or replace function teacher_exam_stats(p_teacher_id uuid)
returns table(
  exam_id uuid,
  exam_title text,
  subject text,
  status text,
  submission_count bigint,
  avg_score float,
  pass_rate float,
  pending_review bigint
) language sql stable as $$
  select
    e.id,
    e.title,
    e.subject,
    e.status,
    count(s.id),
    avg(s.percentage),
    round(100.0 * count(case when s.percentage >= coalesce(e.pass_mark, 40) then 1 end) / nullif(count(s.id), 0), 1),
    count(case when s.status in ('submitted', 'auto_marked') then 1 end)
  from exams e
  left join submissions s on s.exam_id = e.id
  where e.created_by_id = p_teacher_id
  group by e.id, e.title, e.subject, e.status, e.pass_mark
  order by e.created_at desc;
$$;

-- ─── FUNCTION: auto-mark submission on insert ────────────────
-- For MCQ/True-False/Short type exams — fires after answers inserted
create or replace function auto_mark_submission()
returns trigger language plpgsql as $$
declare
  v_has_essay boolean;
  v_score int;
  v_total int;
  v_pct float;
begin
  -- Check if this exam has essay questions
  select exists(
    select 1 from questions q
    join answers a on a.question_id = q.id
    where a.submission_id = new.id and q.type = 'essay'
  ) into v_has_essay;

  -- Calculate score from answers
  select coalesce(sum(a.marks_awarded), 0) into v_score
  from answers a where a.submission_id = new.id;

  -- Get total marks
  select coalesce(e.total_marks, 1) into v_total
  from exams e
  join submissions s on s.exam_id = e.id
  where s.id = new.id;

  v_pct := round((v_score::float / v_total) * 100, 2);

  -- Update submission with computed values
  update submissions set
    score = v_score,
    percentage = v_pct,
    grade = case
      when v_pct >= 80 then 'A'
      when v_pct >= 65 then 'B'
      when v_pct >= 50 then 'C'
      when v_pct >= 40 then 'D'
      else 'F'
    end,
    status = case when v_has_essay then 'auto_marked' else 'auto_marked' end
  where id = new.id;

  return new;
end;
$$;

-- Note: auto_mark trigger not added here since marking happens in the app layer.
-- The function above is available for server-side use if needed.

-- ─── FUNCTION: schedule status auto-update ───────────────────
-- Marks live→completed when window passes (for cron jobs via pg_cron)
create or replace function update_schedule_statuses()
returns void language plpgsql as $$
begin
  -- Mark items as live if they've started
  update schedule_items set status = 'live'
  where status = 'scheduled'
    and scheduled_at <= now()
    and scheduled_at + (duration_mins || ' minutes')::interval > now();

  -- Mark items as completed if their window has passed
  update schedule_items set status = 'completed'
  where status in ('scheduled', 'live')
    and scheduled_at + (duration_mins || ' minutes')::interval <= now();
end;
$$;

-- ─── VIEW: active_exams ──────────────────────────────────────
create or replace view active_exams as
select
  e.*,
  u.name as teacher_name,
  u.role as teacher_role,
  s.name as school_name,
  s.region as school_region,
  count(q.id) as question_count,
  count(sub.id) as submission_count
from exams e
join users u on u.id = e.created_by_id
left join schools s on s.id = e.school_id
left join questions q on q.exam_id = e.id
left join submissions sub on sub.exam_id = e.id
where e.status = 'published'
group by e.id, u.name, u.role, s.name, s.region;

-- ─── VIEW: pending_reviews ───────────────────────────────────
create or replace view pending_reviews as
select
  sub.*,
  u.name as student_name,
  u.email as student_email,
  e.title as exam_title,
  e.subject,
  e.level,
  e.total_marks,
  teacher.name as teacher_name
from submissions sub
join users u on u.id = sub.student_id
join exams e on e.id = sub.exam_id
join users teacher on teacher.id = e.created_by_id
where sub.status in ('submitted', 'auto_marked');

-- ─── VIEW: school_stats ──────────────────────────────────────
create or replace view school_stats as
select
  s.id,
  s.name,
  s.region,
  s.plan,
  count(distinct u.id) filter (where u.role = 'student') as student_count,
  count(distinct u.id) filter (where u.role = 'teacher') as teacher_count,
  count(distinct p.id) filter (where p.status = 'published') as published_papers,
  count(distinct e.id) filter (where e.status = 'published') as published_exams,
  count(distinct sub.id) as total_submissions
from schools s
left join users u on u.school_id = s.id
left join papers p on p.school_id = s.id
left join exams e on e.school_id = s.id
left join submissions sub on sub.exam_id = e.id
group by s.id, s.name, s.region, s.plan;

