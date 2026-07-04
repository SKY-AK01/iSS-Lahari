// TypeScript types for the Lahari Exam Prep app

export type Role = 'mentor' | 'student';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'mcq' | 'short';
export type TestMode = 'practice' | 'exam';
export type Verdict = 'correct' | 'partial' | 'incorrect' | 'unanswered';

export interface Profile {
  id: string;
  role: Role;
  name: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  created_at: string;
}

export interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  created_at: string;
  subject?: Subject;
}

export interface TestBatch {
  id: string;
  chapter_id: string;
  batch_number: number;
  question_count: number;
  difficulty_mix: Record<Difficulty, number> | null;
  created_at: string;
  chapter?: Chapter;
}

export interface Question {
  id: string;
  batch_id: string;
  external_id: string;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  options: string[] | null;
  answer: string;
  explanation: string | null;
  keywords: string[] | null;
  related: string[] | null;
  memory_trick: string | null;
  exam_trap: string | null;
  sources: string[] | null;
  sort_order: number;
}

export interface Attempt {
  id: string;
  student_id: string;
  batch_id: string;
  mode: TestMode;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  marking_correct: number;
  marking_wrong: number;
  marking_partial: number;
  exam_duration_minutes: number | null;
  started_at: string;
  submitted_at: string | null;
  batch?: TestBatch;
  student?: Profile;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  student_answer: string | null;
  verdict: Verdict | null;
  ai_feedback: string | null;
  marks_awarded: number;
  question?: Question;
}

// ---- JSON paste/upload schema (from question_bank.json) ----
export interface PastedQuestionRelated {
  acts?: string[];
  articles?: string[];
  dates?: string[];
  committees?: string[];
  personalities?: string[];
}

export interface PastedQuestionExam {
  name?: string;
  year?: string | number;
  stage?: string;
}

export interface PastedQuestion {
  id: string;
  difficulty: Difficulty;
  type: QuestionType;
  question_category?: string;
  exam?: PastedQuestionExam;
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  keywords?: string[];
  /** Can be an object { acts, articles, ... } or a legacy string array */
  related?: PastedQuestionRelated | string[];
  memory_trick?: string;
  exam_trap?: string;
  why_important?: string;
  sources?: string[];
}

export interface PastedTestJSON {
  chapter: string;
  subject: string;
  batch: number;
  total_questions?: number;
  questions: PastedQuestion[];
}

// ---- Study Material (Mind-Map JSON) ----
export interface MindMapRecord {
  [key: string]: string;
}

export interface MindMapJSON {
  title: string;
  columns: string[];
  records: MindMapRecord[];
  references?: Record<string, string>;
}

export interface StudyMaterial {
  id: string;
  chapter_id: string;
  material_type: 'mind_map' | 'notes' | 'timeline';
  title: string;
  content: MindMapJSON;
  created_at: string;
  chapter?: Chapter;
}

export interface PastedStudyMaterialJSON {
  chapter: string;
  subject: string;
  materials: MindMapJSON[];
}

// ---- Grading ----
export interface GradeRequest {
  question: string;
  correctAnswer: string;
  explanation: string;
  studentAnswer: string;
}

export interface GradeResponse {
  verdict: Verdict;
  feedback: string;
}

// ---- Exam state (stored in localStorage) ----
export interface ExamState {
  batchId: string;
  attemptId: string;
  answers: Record<string, string>; // questionId → studentAnswer
  flagged: Set<string>;            // questionIds
  startedAt: number;               // timestamp ms
  durationMs: number;
}
