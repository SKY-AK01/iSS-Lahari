-- ============================================================
-- LAHARI EXAM PREP — PYQ (Previous Year Papers) Tables
-- Run this in Supabase SQL Editor AFTER full-schema.sql
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS
-- ============================================================

-- ── 1. PAPERS ────────────────────────────────────────────────
create table if not exists papers (
  id               uuid primary key default gen_random_uuid(),
  paper_name       text not null unique,   -- "mains_2024_gs3"
  paper_title      text,
  year             integer not null,
  exam_type        text not null,          -- "UPSC Mains GS Paper 3"
  pdf_url          text,                   -- Supabase Storage public URL
  has_images       boolean not null default false,
  total_questions  integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists idx_papers_year      on papers(year);
create index if not exists idx_papers_exam_type on papers(exam_type);

alter table papers enable row level security;

drop policy if exists "Papers viewable by authenticated users" on papers;
create policy "Papers viewable by authenticated users"
  on papers for select using (auth.role() = 'authenticated');

drop policy if exists "Only mentors can manage papers" on papers;
create policy "Only mentors can manage papers"
  on papers for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));


-- ── 2. PYQ QUESTIONS ─────────────────────────────────────────
create table if not exists pyq_questions (
  id               uuid primary key default gen_random_uuid(),
  paper_id         uuid not null references papers(id) on delete cascade,
  parent_id        uuid references pyq_questions(id) on delete cascade,  -- for sub_questions
  question_number  text not null,       -- "1", "1(a)", "1.1"
  question_type    text,                -- "MCQ", "Statement Based", "Descriptive" etc.
  page_start       integer,
  page_end         integer,
  images           text[],              -- filenames in storage bucket
  tables           text[],              -- markdown tables
  marks            integer,
  word_limit       integer,
  sort_order       integer not null default 0
);

create index if not exists idx_pyq_questions_paper_id  on pyq_questions(paper_id);
create index if not exists idx_pyq_questions_parent_id on pyq_questions(parent_id);

alter table pyq_questions enable row level security;

drop policy if exists "PYQ questions viewable by authenticated users" on pyq_questions;
create policy "PYQ questions viewable by authenticated users"
  on pyq_questions for select using (auth.role() = 'authenticated');

drop policy if exists "Only mentors can manage pyq questions" on pyq_questions;
create policy "Only mentors can manage pyq questions"
  on pyq_questions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));


-- ── 3. PYQ QUESTION CONTENT (bilingual) ──────────────────────
create table if not exists pyq_question_content (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references pyq_questions(id) on delete cascade,
  language      text not null check (language in ('english', 'hindi')),
  passage       text,
  question_text text,
  statements    text[],
  options       text[],
  unique (question_id, language)
);

create index if not exists idx_pyq_content_question_id on pyq_question_content(question_id);

alter table pyq_question_content enable row level security;

drop policy if exists "PYQ content viewable by authenticated users" on pyq_question_content;
create policy "PYQ content viewable by authenticated users"
  on pyq_question_content for select using (auth.role() = 'authenticated');

drop policy if exists "Only mentors can manage pyq content" on pyq_question_content;
create policy "Only mentors can manage pyq content"
  on pyq_question_content for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'mentor'));

-- ── Done ─────────────────────────────────────────────────────
-- Storage buckets (create manually in Supabase Dashboard > Storage):
--   papers-pdf    → public bucket for PDF files
--   papers-images → public bucket for question images
-- Or run in SQL Editor:
-- insert into storage.buckets (id, name, public) values ('papers-pdf', 'papers-pdf', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('papers-images', 'papers-images', true) on conflict do nothing;
