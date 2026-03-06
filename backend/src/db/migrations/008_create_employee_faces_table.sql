-- Store employee face embeddings for recognition
CREATE TABLE IF NOT EXISTS employee_faces (
    pk_face_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fk_employee_id UUID NOT NULL REFERENCES employees(pk_employee_id) ON DELETE CASCADE,
    
    -- Face embedding vector (512 dimensions for ArcFace/FaceNet)
    face_embedding VECTOR(512) NOT NULL,
    
    -- Face image reference
    face_image_url TEXT,
    thumbnail_url TEXT,
    
    -- Quality metrics
    quality_score FLOAT CHECK (quality_score >= 0 AND quality_score <= 1),
    face_confidence FLOAT CHECK (face_confidence >= 0 AND face_confidence <= 1),
    
    -- Model info
    model_version VARCHAR(50) NOT NULL DEFAULT 'arcface-v1.0',
    extraction_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Usage
    is_primary BOOLEAN DEFAULT false, -- Primary face for matching
    is_active BOOLEAN DEFAULT true,
    enrollment_date TIMESTAMPTZ,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'manual_upload', -- manual_upload, camera_capture, import
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Only one primary face per employee
    CONSTRAINT unique_primary_face UNIQUE (fk_employee_id, is_primary) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX idx_employee_faces_employee ON employee_faces(fk_employee_id);
CREATE INDEX idx_employee_faces_active ON employee_faces(is_active) WHERE is_active = true;
CREATE INDEX idx_employee_faces_embedding ON employee_faces USING ivfflat (face_embedding vector_cosine_ops)
    WITH (lists = 100);
CREATE INDEX idx_employee_faces_primary ON employee_faces(fk_employee_id, is_primary) WHERE is_primary = true;

-- Trigger: Ensure only one primary face per employee
CREATE OR REPLACE FUNCTION enforce_single_primary_face()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE employee_faces 
        SET is_primary = false 
        WHERE fk_employee_id = NEW.fk_employee_id 
        AND pk_face_id != NEW.pk_face_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_face
    BEFORE INSERT OR UPDATE ON employee_faces
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_primary_face();
