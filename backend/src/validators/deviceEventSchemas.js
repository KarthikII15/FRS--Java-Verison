import Joi from 'joi';

// Base event schema
export const baseEventSchema = Joi.object({
  eventType: Joi.string().valid(
    'FACE_DETECTED',
    'MOTION_DETECTED',
    'EMPLOYEE_ENTRY',
    'EMPLOYEE_EXIT',
    'DEVICE_HEARTBEAT',
    'DEVICE_ERROR',
    'FRAME_CAPTURED'
  ).required(),
  
  timestamp: Joi.string().isoDate().required(),
  
  // Optional fields based on event type
  payload: Joi.object().default({}),
  
  // Face detection specific
  faceData: Joi.when('eventType', {
    is: Joi.valid('FACE_DETECTED', 'EMPLOYEE_ENTRY', 'EMPLOYEE_EXIT'),
    then: Joi.object({
      embedding: Joi.array().items(Joi.number()).length(512).optional(),
      confidence: Joi.number().min(0).max(1).optional(),
      boundingBox: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        width: Joi.number().required(),
        height: Joi.number().required()
      }).optional(),
      qualityScore: Joi.number().min(0).max(1).optional()
    }).optional(),
    otherwise: Joi.optional()
  }),
  
  // Frame data
  frameData: Joi.when('eventType', {
    is: Joi.valid('FACE_DETECTED', 'FRAME_CAPTURED', 'EMPLOYEE_ENTRY', 'EMPLOYEE_EXIT'),
    then: Joi.object({
      frameId: Joi.string().required(),
      timestamp: Joi.string().isoDate().required(),
      imageUrl: Joi.string().uri().optional(),
      imageData: Joi.string().base64().optional() // Base64 encoded image
    }).required(),
    otherwise: Joi.optional()
  }),
  
  // Device metadata
  deviceMetadata: Joi.object({
    firmwareVersion: Joi.string().optional(),
    temperature: Joi.number().optional(),
    cpuUsage: Joi.number().min(0).max(100).optional(),
    memoryUsage: Joi.number().min(0).max(100).optional()
  }).optional()
});

// Heartbeat schema (simpler)
export const heartbeatSchema = Joi.object({
  eventType: Joi.string().valid('DEVICE_HEARTBEAT').required(),
  timestamp: Joi.string().isoDate().required(),
  deviceMetadata: Joi.object({
    firmwareVersion: Joi.string().optional(),
    temperature: Joi.number().optional(),
    cpuUsage: Joi.number().min(0).max(100).optional(),
    memoryUsage: Joi.number().min(0).max(100).optional(),
    uptime: Joi.number().optional()
  }).optional()
});

// Batch events schema
export const batchEventsSchema = Joi.object({
  events: Joi.array().items(baseEventSchema).min(1).max(100).required()
});

// Face detection specific schema
export const faceDetectedSchema = Joi.object({
  eventType: Joi.string().valid('FACE_DETECTED').required(),
  timestamp: Joi.string().isoDate().required(),
  faceData: Joi.object({
    embedding: Joi.array().items(Joi.number()).length(512).required(),
    confidence: Joi.number().min(0).max(1).required(),
    boundingBox: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required(),
      width: Joi.number().required(),
      height: Joi.number().required()
    }).required(),
    qualityScore: Joi.number().min(0).max(1).optional()
  }).required(),
  frameData: Joi.object({
    frameId: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
    imageUrl: Joi.string().uri().optional(),
    imageData: Joi.string().base64().optional()
  }).required(),
  deviceMetadata: Joi.object({
    firmwareVersion: Joi.string().optional(),
    temperature: Joi.number().optional(),
    cpuUsage: Joi.number().min(0).max(100).optional(),
    memoryUsage: Joi.number().min(0).max(100).optional()
  }).optional()
});

// Employee entry/exit schema
export const employeeEntryExitSchema = Joi.object({
  eventType: Joi.string().valid('EMPLOYEE_ENTRY', 'EMPLOYEE_EXIT').required(),
  timestamp: Joi.string().isoDate().required(),
  faceData: Joi.object({
    embedding: Joi.array().items(Joi.number()).length(512).required(),
    confidence: Joi.number().min(0).max(1).required(),
    matchedEmployeeId: Joi.string().uuid().optional(),
    matchConfidence: Joi.number().min(0).max(1).optional()
  }).required(),
  frameData: Joi.object({
    frameId: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
    imageUrl: Joi.string().uri().optional()
  }).required(),
  entryData: Joi.object({
    direction: Joi.string().valid('in', 'out').optional(),
    zone: Joi.string().optional(),
    method: Joi.string().valid('face_recognition', 'access_card', 'manual').optional()
  }).optional(),
  deviceMetadata: Joi.object().optional()
});
