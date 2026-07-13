-- Study Materials table (mind maps, timelines, notes)
CREATE TABLE IF NOT EXISTS study_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('mind_map', 'note', 'timeline')),
  content       JSONB,   -- the actual graph/map data
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_materials_chapter ON study_materials(chapter_id);

ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_materials_select" ON study_materials FOR SELECT USING (TRUE);
CREATE POLICY "study_materials_insert" ON study_materials FOR INSERT
  WITH CHECK (current_user_role() = 'mentor');
CREATE POLICY "study_materials_update" ON study_materials FOR UPDATE
  USING (current_user_role() = 'mentor');
CREATE POLICY "study_materials_delete" ON study_materials FOR DELETE
  USING (current_user_role() = 'mentor');
