-- ============================================================
-- LAHARI EXAM PREP — Full Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS + IF NOT EXISTS
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
-- Extends Supabase auth.users with role and display name.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('mentor', 'student')) default 'student',
  name        text not null default '',
  created_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email, 'New User'),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

drop policy if exists "Mentors can view all profiles" on profiles;
create policy "Mentors can view all profiles"
  on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));


-- ── 2. SUBJECTS ──────────────────────────────────────────────
create table if not exists subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

alter table subjects enable row level security;

drop policy if exists "Subjects viewable by authenticated users" on subjects;
create policy "Subjects viewable by authenticated users"
  on subjects for select using (auth.role() = 'authenticated');

drop policy if exists "Only mentors can insert subjects" on subjects;
create policy "Only mentors can insert subjects"
  on subjects for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Only mentors can update subjects" on subjects;
create policy "Only mentors can update subjects"
  on subjects for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));


-- ── 3. CHAPTERS ───────────────────────────────────────────────
create table if not exists chapters (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references subjects(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (subject_id, name)
);

create index if not exists idx_chapters_subject_id on chapters(subject_id);

alter table chapters enable row level security;

drop policy if exists "Chapters viewable by authenticated users" on chapters;
create policy "Chapters viewable by authenticated users"
  on chapters for select using (auth.role() = 'authenticated');

drop policy if exists "Only mentors can insert chapters" on chapters;
create policy "Only mentors can insert chapters"
  on chapters for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Only mentors can update chapters" on chapters;
create policy "Only mentors can update chapters"
  on chapters for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));


-- ── 4. TEST BATCHES ───────────────────────────────────────────
create table if not exists test_batches (
  id               uuid primary key default gen_random_uuid(),
  chapter_id       uuid not null references chapters(id) on delete cascade,
  batch_number     int not null,
  question_count   int not null default 0,
  difficulty_mix   jsonb,
  created_at       timestamptz not null default now(),
  unique (chapter_id, batch_number)
);

create index if not exists idx_test_batches_chapter_id on test_batches(chapter_id);

alter table test_batches enable row level security;

drop policy if exists "Test batches viewable by authenticated users" on test_batches;
create policy "Test batches viewable by authenticated users"
  on test_batches for select using (auth.role() = 'authenticated');

drop policy if exists "Only mentors can insert test batches" on test_batches;
create policy "Only mentors can insert test batches"
  on test_batches for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Only mentors can update test batches" on test_batches;
create policy "Only mentors can update test batches"
  on test_batches for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Only mentors can delete test batches" on test_batches;
create policy "Only mentors can delete test batches"
  on test_batches for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));


-- ── 5. QUESTIONS ──────────────────────────────────────────────
create table if not exists questions (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references test_batches(id) on delete cascade,
  external_id   text,
  type          text not null check (type in ('mcq', 'short')),
  difficulty    text not null check (difficulty in ('easy', 'medium', 'hard')),
  question      text not null,
  options       jsonb,
  answer        text not null,
  explanation   text,
  keywords      jsonb,
  related       jsonb,
  memory_trick  text,
  exam_trap     text,
  sources       jsonb,
  sort_order    int not null default 0
);

create index if not exists idx_questions_batch_id on questions(batch_id);

alter table questions enable row level security;

drop policy if exists "Questions viewable by authenticated users" on questions;
create policy "Questions viewable by authenticated users"
  on questions for select using (auth.role() = 'authenticated');

drop policy if exists "Only mentors can insert questions" on questions;
create policy "Only mentors can insert questions"
  on questions for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Only mentors can update questions" on questions;
create policy "Only mentors can update questions"
  on questions for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Only mentors can delete questions" on questions;
create policy "Only mentors can delete questions"
  on questions for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));


-- ── 6. STUDY MATERIALS ────────────────────────────────────────
create table if not exists study_materials (
  id             uuid primary key default gen_random_uuid(),
  chapter_id     uuid not null references chapters(id) on delete cascade,
  material_type  text not null check (material_type in ('mind_map', 'notes', 'timeline')),
  title          text not null,
  content        jsonb not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_study_materials_chapter_id on study_materials(chapter_id);

alter table study_materials enable row level security;

drop policy if exists "Study materials viewable by authenticated users" on study_materials;
create policy "Study materials viewable by authenticated users"
  on study_materials for select using (auth.role() = 'authenticated');

drop policy if exists "Only mentors can insert study materials" on study_materials;
create policy "Only mentors can insert study materials"
  on study_materials for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Only mentors can update study materials" on study_materials;
create policy "Only mentors can update study materials"
  on study_materials for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Only mentors can delete study materials" on study_materials;
create policy "Only mentors can delete study materials"
  on study_materials for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));


-- ── 7. ATTEMPTS ────────────────────────────────────────────────
create table if not exists attempts (
  id                      uuid primary key default gen_random_uuid(),
  student_id              uuid not null references profiles(id) on delete cascade,
  batch_id                uuid not null references test_batches(id) on delete cascade,
  mode                    text not null check (mode in ('practice', 'exam')),
  score                   numeric,
  max_score               numeric,
  percentage              numeric,
  marking_correct         numeric not null default 2,
  marking_wrong           numeric not null default 0,
  marking_partial         numeric not null default 0,
  exam_duration_minutes   int,
  started_at              timestamptz not null default now(),
  submitted_at            timestamptz
);

create index if not exists idx_attempts_student_id on attempts(student_id);
create index if not exists idx_attempts_batch_id   on attempts(batch_id);

alter table attempts enable row level security;

drop policy if exists "Students can view own attempts" on attempts;
create policy "Students can view own attempts"
  on attempts for select using (student_id = auth.uid());

drop policy if exists "Mentors can view all attempts" on attempts;
create policy "Mentors can view all attempts"
  on attempts for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Authenticated users can insert attempts" on attempts;
create policy "Authenticated users can insert attempts"
  on attempts for insert
  with check (student_id = auth.uid());

drop policy if exists "Students can update own attempts" on attempts;
create policy "Students can update own attempts"
  on attempts for update
  using (student_id = auth.uid());


-- ── 8. ATTEMPT ANSWERS ─────────────────────────────────────────
create table if not exists attempt_answers (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null references attempts(id) on delete cascade,
  question_id     uuid not null references questions(id) on delete cascade,
  student_answer  text,
  verdict         text check (verdict in ('correct', 'partial', 'incorrect', 'unanswered')),
  ai_feedback     text,
  marks_awarded   numeric not null default 0
);

create index if not exists idx_attempt_answers_attempt_id  on attempt_answers(attempt_id);
create index if not exists idx_attempt_answers_question_id on attempt_answers(question_id);

alter table attempt_answers enable row level security;

drop policy if exists "Students can view own attempt answers" on attempt_answers;
create policy "Students can view own attempt answers"
  on attempt_answers for select
  using (exists (select 1 from attempts where id = attempt_id and student_id = auth.uid()));

drop policy if exists "Mentors can view all attempt answers" on attempt_answers;
create policy "Mentors can view all attempt answers"
  on attempt_answers for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

drop policy if exists "Authenticated users can insert attempt answers" on attempt_answers;
create policy "Authenticated users can insert attempt answers"
  on attempt_answers for insert
  with check (
    exists (select 1 from attempts where id = attempt_id and student_id = auth.uid())
  );

-- ── Done ─────────────────────────────────────────────────────
-- All 8 tables created with RLS policies.
-- After running this, set a user's role to 'mentor' manually:
--   update profiles set role = 'mentor' where id = '<user-uuid>';
