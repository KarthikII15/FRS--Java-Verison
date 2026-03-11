-- Raw events from devices (before processing)
CREATE TABLE IF NOT EXISTS device_events (
    pk_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fk_device_id UUID NOT NULL REFERENCES devices(pk_device_id),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'FACE_DETECTED',
        'MOTION_DETECTED',
        'EMPLOYEE_ENTRY',
        'EMPLOYEE_EXIT',
        'DEVICE_HEARTBEAT',
        'DEVICE_ERROR',
        'FRAME_CAPTURED'
    )),
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'ignored')),
    
    -- Event payload (flexible JSON)
    payload_json JSONB NOT NULL DEFAULT '{}',
    
    -- Key fields extracted for indexing/querying
    detected_face_embedding VECTOR(512), -- If face detected
    confidence_score FLOAT,
    frame_url TEXT,
    employee_id BIGINT REFERENCES hr_employee(pk_employee_id), -- If matched
    
    -- Processing metadata
    processing_attempts INTEGER DEFAULT 0,
    processing_error TEXT,
    processor_service VARCHAR(50) -- Which service processed this
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_device_events_device_time ON device_events(fk_device_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_unprocessed ON device_events(processing_status) WHERE processing_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_device_events_type_time ON device_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_face_embedding ON device_events USING ivfflat (detected_face_embedding vector_cosine_ops)
    WITH (lists = 100); -- For fast face matching
