import { pool } from '../db/pool.js';

export async function createDeviceEvent(eventData) {
  const {
    deviceId,
    eventType,
    occurredAt,
    payloadJson,
    detectedFaceEmbedding,
    confidenceScore,
    frameUrl,
    processingStatus = 'pending'
  } = eventData;
  
  const result = await pool.query(
    `INSERT INTO device_events (
      fk_device_id,
      event_type,
      occurred_at,
      payload_json,
      detected_face_embedding,
      confidence_score,
      frame_url,
      processing_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      deviceId,
      eventType,
      occurredAt,
      JSON.stringify(payloadJson),
      detectedFaceEmbedding ? JSON.stringify(detectedFaceEmbedding) : null,
      confidenceScore,
      frameUrl,
      processingStatus
    ]
  );
  
  return result.rows[0];
}

export async function createAttendanceEvent(eventData) {
  const {
    employeeId,
    deviceId,
    originalEventId,
    eventType,
    occurredAt,
    confidenceScore,
    verificationMethod,
    recognitionModelVersion,
    frameImageUrl,
    faceBoundingBox,
    locationZone,
    entryExitDirection,
    shiftId,
    isExpectedEntry,
    isOnTime
  } = eventData;
  
  const result = await pool.query(
    `INSERT INTO attendance_events (
      fk_employee_id,
      fk_device_id,
      fk_original_event_id,
      event_type,
      occurred_at,
      confidence_score,
      verification_method,
      recognition_model_version,
      frame_image_url,
      face_bounding_box,
      location_zone,
      entry_exit_direction,
      fk_shift_id,
      is_expected_entry,
      is_on_time
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      employeeId, deviceId, originalEventId, eventType, occurredAt,
      confidenceScore, verificationMethod, recognitionModelVersion,
      frameImageUrl, JSON.stringify(faceBoundingBox), locationZone,
      entryExitDirection, shiftId, isExpectedEntry, isOnTime
    ]
  );
  
  return result.rows[0];
}

export async function findUnprocessedEvents(limit = 100) {
  const result = await pool.query(
    `SELECT * FROM device_events 
     WHERE processing_status = 'pending'
     ORDER BY occurred_at ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function updateEventProcessingStatus(eventId, status, error = null) {
  await pool.query(
    `UPDATE device_events 
     SET processing_status = $2,
         processing_attempts = processing_attempts + 1,
         processing_error = $3,
         processed_at = CASE WHEN $2 IN ('completed', 'failed', 'ignored') THEN NOW() ELSE NULL END
     WHERE pk_event_id = $1`,
    [eventId, status, error]
  );
}

export async function findSimilarFaces(faceEmbedding, threshold = 0.8, limit = 5) {
  const result = await pool.query(
    `SELECT 
        ef.pk_face_id,
        ef.fk_employee_id,
        e.employee_name,
        ef.face_embedding <=> $1 as distance,
        1 - (ef.face_embedding <=> $1) as similarity
     FROM employee_faces ef
     JOIN employees e ON ef.fk_employee_id = e.pk_employee_id
     WHERE ef.is_active = true
     AND ef.face_embedding <=> $1 < $2
     ORDER BY ef.face_embedding <=> $1
     LIMIT $3`,
    [JSON.stringify(faceEmbedding), 1 - threshold, limit]
  );
  
  return result.rows.map(row => ({
    ...row,
    similarity: parseFloat(row.similarity)
  }));
}

export async function getEventById(eventId) {
  const result = await pool.query(
    `SELECT * FROM device_events WHERE pk_event_id = $1`,
    [eventId]
  );
  return result.rows[0] || null;
}

export async function listEventsByDevice(deviceId, options = {}) {
  const { limit = 100, offset = 0, eventType, startDate, endDate } = options;
  
  let query = `SELECT * FROM device_events WHERE fk_device_id = $1`;
  const params = [deviceId];
  let paramIndex = 2;
  
  if (eventType) {
    query += ` AND event_type = $${paramIndex++}`;
    params.push(eventType);
  }
  
  if (startDate) {
    query += ` AND occurred_at >= $${paramIndex++}`;
    params.push(startDate);
  }
  
  if (endDate) {
    query += ` AND occurred_at <= $${paramIndex++}`;
    params.push(endDate);
  }
  
  query += ` ORDER BY occurred_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  return result.rows;
}
