-- Run this in your Supabase SQL Editor
-- Creates the study_materials table for mind-maps, timelines, and notes

create table if not exists study_materials (
  id            uuid primary key default gen_random_uuid(),
  chapter_id    uuid not null references chapters(id) on delete cascade,
  material_type text not null check (material_type in ('mind_map', 'notes', 'timeline')),
  title         text not null,
  content       jsonb not null,
  created_at    timestamptz not null default now()
);

-- Index for fast chapter lookups
create index if not exists idx_study_materials_chapter_id on study_materials(chapter_id);

-- RLS: anyone authenticated can read; only mentors can write
alter table study_materials enable row level security;

create policy "Study materials are viewable by authenticated users"
  on study_materials for select
  using (auth.role() = 'authenticated');

create policy "Only mentors can insert study materials"
  on study_materials for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'mentor'
    )
  );

create policy "Only mentors can update study materials"
  on study_materials for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'mentor'
    )
  );

create policy "Only mentors can delete study materials"
  on study_materials for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'mentor'
    )
  );
