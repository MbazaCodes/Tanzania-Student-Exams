-- ============================================================
-- ExamHub Tanzania — Forum System
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── FORUM CHANNELS (one per level+subject combo) ────────────
create table if not exists forum_channels (
  id          uuid primary key default uuid_generate_v4(),
  level       text not null
                check (level in ('standard_4','standard_7','form_2','form_4','form_6','general')),
  subject     text not null,
  description text,
  created_at  timestamptz default now()
);
create unique index if not exists idx_forum_channel_level_subject
  on forum_channels(level, subject);
create index if not exists idx_forum_channel_level on forum_channels(level);

-- Seed default channels for all level+subject combos
insert into forum_channels (level, subject, description) values
  ('general',     'General',          'Open discussion for all ExamHub users'),
  ('standard_4',  'Mathematics',      'Standard 4 Mathematics discussions'),
  ('standard_4',  'English',          'Standard 4 English discussions'),
  ('standard_4',  'Kiswahili',        'Standard 4 Kiswahili discussions'),
  ('standard_7',  'Mathematics',      'PSLE Mathematics — revision and problems'),
  ('standard_7',  'English',          'PSLE English Language'),
  ('standard_7',  'Kiswahili',        'PSLE Kiswahili'),
  ('standard_7',  'Science',          'Standard 7 Science & Technology'),
  ('form_2',      'Mathematics',      'Form 2 FTNA Mathematics'),
  ('form_2',      'English',          'Form 2 English Language'),
  ('form_2',      'Biology',          'Form 2 Biology'),
  ('form_2',      'Chemistry',        'Form 2 Chemistry'),
  ('form_2',      'Physics',          'Form 2 Physics'),
  ('form_2',      'Geography',        'Form 2 Geography'),
  ('form_2',      'History',          'Form 2 History'),
  ('form_2',      'Civics',           'Form 2 Civics'),
  ('form_4',      'Mathematics',      'CSEE Mathematics — past papers & problems'),
  ('form_4',      'English',          'CSEE English Language'),
  ('form_4',      'Biology',          'CSEE Biology'),
  ('form_4',      'Chemistry',        'CSEE Chemistry'),
  ('form_4',      'Physics',          'CSEE Physics'),
  ('form_4',      'Geography',        'CSEE Geography'),
  ('form_4',      'History',          'CSEE History'),
  ('form_4',      'Civics',           'CSEE Civics'),
  ('form_4',      'Kiswahili',        'CSEE Kiswahili'),
  ('form_4',      'Commerce',         'CSEE Commerce'),
  ('form_4',      'Book-Keeping',     'CSEE Book-Keeping'),
  ('form_4',      'Computer Studies', 'CSEE Computer Studies'),
  ('form_4',      'Agriculture',      'CSEE Agriculture'),
  ('form_6',      'Mathematics',      'ACSEE Advanced Mathematics'),
  ('form_6',      'Physics',          'ACSEE Physics'),
  ('form_6',      'Chemistry',        'ACSEE Chemistry'),
  ('form_6',      'Biology',          'ACSEE Biology'),
  ('form_6',      'General Studies',  'ACSEE General Studies'),
  ('form_6',      'Geography',        'ACSEE Geography'),
  ('form_6',      'History',          'ACSEE History'),
  ('form_6',      'Economics',        'ACSEE Economics'),
  ('form_6',      'Kiswahili',        'ACSEE Kiswahili')
on conflict (level, subject) do nothing;

-- ─── FORUM TOPICS (threads) ──────────────────────────────────
create table if not exists forum_topics (
  id           uuid primary key default uuid_generate_v4(),
  channel_id   uuid not null references forum_channels(id) on delete cascade,
  author_id    uuid not null references users(id) on delete cascade,
  title        text not null,
  body         text not null,
  is_pinned    boolean default false,
  is_locked    boolean default false,
  views        int default 0,
  reply_count  int default 0,
  last_reply_at timestamptz default now(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_topic_channel_id  on forum_topics(channel_id);
create index if not exists idx_topic_author_id   on forum_topics(author_id);
create index if not exists idx_topic_last_reply  on forum_topics(last_reply_at desc);
create index if not exists idx_topic_pinned      on forum_topics(is_pinned desc, last_reply_at desc);

-- ─── FORUM POSTS (replies inside a topic) ────────────────────
create table if not exists forum_posts (
  id           uuid primary key default uuid_generate_v4(),
  topic_id     uuid not null references forum_topics(id) on delete cascade,
  author_id    uuid not null references users(id) on delete cascade,
  parent_id    uuid references forum_posts(id) on delete set null,  -- for threaded replies
  body         text not null,
  image_url    text,
  file_url     text,
  file_name    text,
  is_solution  boolean default false,  -- teacher can mark as official answer
  like_count   int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_post_topic_id   on forum_posts(topic_id);
create index if not exists idx_post_author_id  on forum_posts(author_id);
create index if not exists idx_post_parent_id  on forum_posts(parent_id);
create index if not exists idx_post_created    on forum_posts(created_at asc);

-- ─── FORUM LIKES ─────────────────────────────────────────────
create table if not exists forum_likes (
  user_id  uuid not null references users(id) on delete cascade,
  post_id  uuid not null references forum_posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────
do $$ begin
  create trigger t_topic_upd before update on forum_topics
    for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger t_post_upd before update on forum_posts
    for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;

-- ─── FUNCTION: toggle like ────────────────────────────────────
create or replace function toggle_forum_like(p_user_id uuid, p_post_id uuid)
returns table(liked boolean, like_count int) language plpgsql as $$
declare
  v_exists boolean;
  v_count  int;
begin
  select exists(select 1 from forum_likes where user_id=p_user_id and post_id=p_post_id)
  into v_exists;

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
  like_count := v_count;
  return next;
end;
$$;

-- ─── FUNCTION: increment topic views ─────────────────────────
create or replace function increment_topic_views(p_topic_id uuid)
returns void language sql as $$
  update forum_topics set views = views + 1 where id = p_topic_id;
$$;

-- ─── FUNCTION: update reply_count + last_reply_at ────────────
create or replace function sync_topic_reply_stats()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update forum_topics
    set reply_count = reply_count + 1, last_reply_at = now()
    where id = new.topic_id;
  elsif TG_OP = 'DELETE' then
    update forum_topics
    set reply_count = greatest(reply_count - 1, 0)
    where id = old.topic_id;
  end if;
  return coalesce(new, old);
end;
$$;

do $$ begin
  create trigger t_post_sync_stats after insert or delete on forum_posts
    for each row execute procedure sync_topic_reply_stats();
exception when duplicate_object then null; end $$;

-- ─── RLS ─────────────────────────────────────────────────────
alter table forum_channels enable row level security;
alter table forum_topics   enable row level security;
alter table forum_posts    enable row level security;
alter table forum_likes    enable row level security;

create policy "public_read_channels" on forum_channels for select using (true);
create policy "public_read_topics"   on forum_topics   for select using (true);
create policy "public_read_posts"    on forum_posts     for select using (true);
create policy "public_read_likes"    on forum_likes     for select using (true);
create policy "service_all_channels" on forum_channels  for all    using (true) with check (true);
create policy "service_all_topics"   on forum_topics    for all    using (true) with check (true);
create policy "service_all_posts"    on forum_posts     for all    using (true) with check (true);
create policy "service_all_likes"    on forum_likes     for all    using (true) with check (true);

-- ─── REALTIME ────────────────────────────────────────────────
alter publication supabase_realtime add table forum_topics;
alter publication supabase_realtime add table forum_posts;
alter publication supabase_realtime add table forum_likes;

-- ─── STORAGE bucket for forum attachments ────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'forum-attachments', 'forum-attachments', true, 10485760,
  array['image/jpeg','image/png','image/gif','image/webp',
        'application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set public = true, file_size_limit = 10485760;

create policy "public_read_forum_files"  on storage.objects for select using (bucket_id = 'forum-attachments');
create policy "auth_upload_forum_files"  on storage.objects for insert with check (bucket_id = 'forum-attachments');
create policy "auth_delete_forum_files"  on storage.objects for delete using (bucket_id = 'forum-attachments');

