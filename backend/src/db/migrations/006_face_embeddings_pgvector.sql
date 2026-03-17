-- Migration 006: pgvector employee face embeddings table + HNSW index
-- Depends on: migration 004 (vector extension must already exist)

CREATE EXTENSION IF NOT EXISTS vector;

-- One row per enrolled face photo per employee.
-- An employee can have multiple photos (glasses, no glasses, etc.)
CREATE TABLE IF NOT EXISTS employee_face_embeddings (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     BIGINT       NOT NULL
                    REFERENCES hr_employee(pk_employee_id) ON DELETE CASCADE,
  embedding       vector(512)  NOT NULL,
  model_version   VARCHAR(50)  DEFAULT 'arcface-r50-fp16',
  quality_score   FLOAT,
  is_primary      BOOLEAN      DEFAULT FALSE,
  enrolled_by     BIGINT       REFERENCES frs_user(pk_user_id),
  enrolled_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- HNSW index for sub-5ms cosine nearest-neighbour search.
-- m=16 = connections per layer (more = better recall, more RAM)
-- ef_construction=64 = build quality (more = slower build, better index)
CREATE INDEX IF NOT EXISTS idx_employee_face_hnsw
  ON employee_face_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Track whether employee has any face enrolled (for HR dashboard quick filter)
ALTER TABLE hr_employee
  ADD COLUMN IF NOT EXISTS face_enrolled BOOLEAN DEFAULT FALSE;

-- Auto-sync face_enrolled flag on insert/delete
CREATE OR REPLACE FUNCTION sync_face_enrolled()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hr_employee
      SET face_enrolled = TRUE
      WHERE pk_employee_id = NEW.employee_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hr_employee
      SET face_enrolled = (
        EXISTS (
          SELECT 1 FROM employee_face_embeddings
          WHERE employee_id = OLD.employee_id
        )
      )
      WHERE pk_employee_id = OLD.employee_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_face_enrolled ON employee_face_embeddings;
CREATE TRIGGER trg_sync_face_enrolled
  AFTER INSERT OR DELETE ON employee_face_embeddings
  FOR EACH ROW EXECUTE FUNCTION sync_face_enrolled();
