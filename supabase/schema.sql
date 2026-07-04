-- ============================================================
-- IIS/CGL Exam Prep Website — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (one row per auth user, stores role)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile on signup (role defaults to 'student')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (NEW.id, 'student', COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SUBJECTS (e.g. Polity, History, Geography, Economy)
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHAPTERS (belongs to a subject)
-- ============================================================
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, name)
);

-- ============================================================
-- TEST BATCHES (one batch of ~15 questions)
-- ============================================================
CREATE TABLE IF NOT EXISTS test_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0,
  difficulty_mix JSONB,   -- { "easy": 5, "medium": 5, "hard": 5 }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, batch_number)
);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES test_batches(id) ON DELETE CASCADE,
  external_id TEXT,       -- "q1", "q2" etc from the JSON
  type TEXT NOT NULL CHECK (type IN ('mcq', 'short')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question TEXT NOT NULL,
  options JSONB,           -- ["A", "B", "C", "D"] — only for MCQ
  answer TEXT NOT NULL,
  explanation TEXT,
  keywords JSONB,          -- ["keyword1", "keyword2"]
  related JSONB,           -- ["Act 1919", "Dyarchy"]
  memory_trick TEXT,
  exam_trap TEXT,
  sources JSONB,           -- ["NCERT", "Laxmikanth"]
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTEMPTS (one test-taking session)
-- ============================================================
CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES test_batches(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'exam')),
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  marking_correct NUMERIC DEFAULT 2,
  marking_wrong NUMERIC DEFAULT -0.5,
  marking_partial NUMERIC DEFAULT 1,
  exam_duration_minutes INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

-- ============================================================
-- ATTEMPT ANSWERS (her answer to each question)
-- ============================================================
CREATE TABLE IF NOT EXISTS attempt_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  verdict TEXT CHECK (verdict IN ('correct', 'partial', 'incorrect', 'unanswered')),
  ai_feedback TEXT,         -- one-line feedback from Gemini grading
  marks_awarded NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- PROFILES: users can read their own profile; mentor reads all
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR current_user_role() = 'mentor');
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- SUBJECTS: everyone can read; only mentor can write
CREATE POLICY "subjects_select" ON subjects FOR SELECT USING (TRUE);
CREATE POLICY "subjects_insert" ON subjects FOR INSERT
  WITH CHECK (current_user_role() = 'mentor');
CREATE POLICY "subjects_update" ON subjects FOR UPDATE
  USING (current_user_role() = 'mentor');
CREATE POLICY "subjects_delete" ON subjects FOR DELETE
  USING (current_user_role() = 'mentor');

-- CHAPTERS: same as subjects
CREATE POLICY "chapters_select" ON chapters FOR SELECT USING (TRUE);
CREATE POLICY "chapters_insert" ON chapters FOR INSERT
  WITH CHECK (current_user_role() = 'mentor');
CREATE POLICY "chapters_update" ON chapters FOR UPDATE
  USING (current_user_role() = 'mentor');
CREATE POLICY "chapters_delete" ON chapters FOR DELETE
  USING (current_user_role() = 'mentor');

-- TEST_BATCHES: same as subjects
CREATE POLICY "batches_select" ON test_batches FOR SELECT USING (TRUE);
CREATE POLICY "batches_insert" ON test_batches FOR INSERT
  WITH CHECK (current_user_role() = 'mentor');
CREATE POLICY "batches_update" ON test_batches FOR UPDATE
  USING (current_user_role() = 'mentor');
CREATE POLICY "batches_delete" ON test_batches FOR DELETE
  USING (current_user_role() = 'mentor');

-- QUESTIONS: students can read (needed to take tests); mentor can write
-- NOTE: answer/explanation/etc are returned only for mentor OR after attempt submitted
-- (Enforced at app level for exam mode — DB returns all fields, app withholds them)
CREATE POLICY "questions_select" ON questions FOR SELECT USING (TRUE);
CREATE POLICY "questions_insert" ON questions FOR INSERT
  WITH CHECK (current_user_role() = 'mentor');
CREATE POLICY "questions_update" ON questions FOR UPDATE
  USING (current_user_role() = 'mentor');
CREATE POLICY "questions_delete" ON questions FOR DELETE
  USING (current_user_role() = 'mentor');

-- ATTEMPTS: student sees own; mentor sees all
CREATE POLICY "attempts_select" ON attempts FOR SELECT
  USING (student_id = auth.uid() OR current_user_role() = 'mentor');
CREATE POLICY "attempts_insert" ON attempts FOR INSERT
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "attempts_update" ON attempts FOR UPDATE
  USING (student_id = auth.uid() OR current_user_role() = 'mentor');

-- ATTEMPT_ANSWERS: student sees own; mentor sees all
CREATE POLICY "answers_select" ON attempt_answers FOR SELECT
  USING (
    attempt_id IN (SELECT id FROM attempts WHERE student_id = auth.uid())
    OR current_user_role() = 'mentor'
  );
CREATE POLICY "answers_insert" ON attempt_answers FOR INSERT
  WITH CHECK (
    attempt_id IN (SELECT id FROM attempts WHERE student_id = auth.uid())
  );
CREATE POLICY "answers_update" ON attempt_answers FOR UPDATE
  USING (
    attempt_id IN (SELECT id FROM attempts WHERE student_id = auth.uid())
    OR current_user_role() = 'mentor'
  );

-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_batches_chapter ON test_batches(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_batch ON questions(batch_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_batch ON attempts(batch_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON attempt_answers(attempt_id);

-- ============================================================
-- AFTER RUNNING THIS SQL:
-- 1. Go to Dashboard → Authentication → Users
-- 2. Create your Mentor account, then set role:
--    UPDATE profiles SET role = 'mentor', name = 'Your Name'
--    WHERE id = '<your-user-id>';
-- ============================================================
