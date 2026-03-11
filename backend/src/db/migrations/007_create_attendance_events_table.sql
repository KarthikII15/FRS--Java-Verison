-- Final attendance records (after face recognition processing)
CREATE TABLE IF NOT EXISTS attendance_events (
    pk_attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fk_employee_id BIGINT NOT NULL REFERENCES hr_employee(pk_employee_id),
    fk_device_id UUID NOT NULL REFERENCES devices(pk_device_id),
    fk_original_event_id UUID REFERENCES device_events(pk_event_id),
    
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('entry', 'exit', 'movement')),
    occurred_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Recognition details
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    verification_method VARCHAR(20) DEFAULT 'face_recognition' CHECK (verification_method IN (
        'face_recognition',
        'manual',
        'access_card',
        'mobile_app',
        'unknown'
    )),
    recognition_model_version VARCHAR(50),
    
    -- Evidence
    frame_image_url TEXT,
    face_bounding_box JSONB, -- {x, y, width, height}
    
    -- Location context
    location_zone VARCHAR(100),
    entry_exit_direction VARCHAR(20) CHECK (entry_exit_direction IN ('in', 'out', 'unknown')),
    
    -- Shift matching
    fk_shift_id BIGINT REFERENCES hr_shift(pk_shift_id),
    is_expected_entry BOOLEAN,
    is_on_time BOOLEAN,
    
    -- Status
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'disputed', 'cancelled')),
    disputed_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_time ON attendance_events(fk_employee_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_device_time ON attendance_events(fk_device_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_time ON attendance_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_events(status);
