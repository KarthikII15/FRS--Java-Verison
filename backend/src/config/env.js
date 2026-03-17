import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return fallback;
};

export const env = {
  port: toNumber(process.env.PORT, 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  
  http: {
    timeoutMs: toNumber(process.env.HTTP_TIMEOUT_MS, 15000),
  },
  
  edgeAI: {
    baseUrl: process.env.EDGE_AI_URL || 'http://localhost:5000',
  },
  
  analytics: {
    frameQueueSize: toNumber(process.env.FRAME_QUEUE_SIZE, 100),
    eventQueueSize: toNumber(process.env.EVENT_QUEUE_SIZE, 1000),
    snapshotQueueSize: toNumber(process.env.SNAPSHOT_QUEUE_SIZE, 500),
    inferenceThreads: toNumber(process.env.INFERENCE_THREADS, 4),
    eventPushThreads: toNumber(process.env.EVENT_PUSH_THREADS, 2),
    maxHeapMemoryPercent: toNumber(process.env.MAX_HEAP_MEMORY_PERCENT, 80),
    frameBufferSize: toNumber(process.env.FRAME_BUFFER_SIZE, 10),
    motionSkipFrames: toNumber(process.env.MOTION_SKIP_FRAMES, 3),
    configPath: process.env.CONFIG_PATH || path.join(__dirname, '../../conf'),
    modelPath: process.env.MODEL_PATH || path.join(__dirname, '../../models'),
    monitoringConfigApi: process.env.MONITORING_CONFIG_API,
    ruleConfigApi: process.env.RULE_CONFIG_API,
    modelConfigApi: process.env.MODEL_CONFIG_API,
    monitoringUrl: process.env.MONITORING_URL,
    uploadUrl: process.env.UPLOAD_URL,
    enableFaceRecognition: toBoolean(process.env.ENABLE_FACE_RECOGNITION, false),
    enableAlpr: toBoolean(process.env.ENABLE_ALPR, false),
    enableReId: toBoolean(process.env.ENABLE_REID, false),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'scanalitix-node',
    groupId: process.env.KAFKA_GROUP_ID || 'scanalitix-consumer-group',
    topicPrefix: process.env.KAFKA_TOPIC_PREFIX || 'scanalitix.',
    sslEnabled: toBoolean(process.env.KAFKA_SSL_ENABLED, false),
    saslMechanism: process.env.KAFKA_SASL_MECHANISM,
    saslUsername: process.env.KAFKA_SASL_USERNAME,
    saslPassword: process.env.KAFKA_SASL_PASSWORD,
    sessionTimeout: toNumber(process.env.KAFKA_CONSUMER_SESSION_TIMEOUT, 30000),
    rebalanceTimeout: toNumber(process.env.KAFKA_CONSUMER_REBALANCE_TIMEOUT, 60000),
    numPartitions: toNumber(process.env.KAFKA_NUM_PARTITIONS, 3),
    replicationFactor: toNumber(process.env.KAFKA_REPLICATION_FACTOR, 1),
    
    topics: {
      rawFrames: process.env.KAFKA_TOPIC_RAW_FRAMES || 'scanalitix.raw-frames',
      detections: process.env.KAFKA_TOPIC_DETECTIONS || 'scanalitix.detections',
      events: process.env.KAFKA_TOPIC_EVENTS || 'scanalitix.events',
      alerts: process.env.KAFKA_TOPIC_ALERTS || 'scanalitix.alerts',
      smartSearch: process.env.KAFKA_TOPIC_SMART_SEARCH || 'scanalitix.smart-search',
      smartSearchResults: process.env.KAFKA_TOPIC_SMART_SEARCH_RESULTS || 'scanalitix.smart-search-results',
      systemMetrics: process.env.KAFKA_TOPIC_SYSTEM_METRICS || 'scanalitix.system-metrics',
      snapshots: process.env.KAFKA_TOPIC_SNAPSHOTS || 'scanalitix.snapshots'
    }
  },

  face: {
    matchThreshold: toNumber(process.env.FACE_MATCH_THRESHOLD, 0.6),
    dbPath: process.env.FACE_DB_PATH || './data/faces.db'
  },

  snapshot: {
    tempDir: process.env.SNAPSHOT_TEMP_DIR || './temp/snapshots',
    concurrency: toNumber(process.env.SNAPSHOT_UPLOAD_CONCURRENCY, 3),
    maxRetries: toNumber(process.env.SNAPSHOT_MAX_RETRIES, 3),
    compressionQuality: toNumber(process.env.SNAPSHOT_COMPRESSION_QUALITY, 80),
    maxTempSizeMB: toNumber(process.env.SNAPSHOT_MAX_TEMP_SIZE_MB, 1024)
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toNumber(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || 'attendance_intelligence',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: toBoolean(process.env.DB_SSL, false),
    max: toNumber(process.env.DB_POOL_MAX, 20),
    idleTimeoutMillis: toNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: toNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 5000),
  },
  
  token: {
    accessTokenTtlMinutes: toNumber(process.env.ACCESS_TOKEN_TTL_MINUTES, 30),
    refreshTokenTtlDays: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  },
  
  authMode: process.env.AUTH_MODE || 'api',
  
  keycloak: {
    url: process.env.KEYCLOAK_URL || 'http://localhost:9090',
    realm: process.env.KEYCLOAK_REALM || 'attendance',
    issuer: process.env.KEYCLOAK_ISSUER || 'http://localhost:9090/realms/attendance',
    audience: process.env.KEYCLOAK_AUDIENCE || 'attendance-api',
    jwksUri: process.env.KEYCLOAK_JWKS_URI || 'http://localhost:9090/realms/attendance/protocol/openid-connect/certs',
    clockToleranceSec: Number(process.env.KEYCLOAK_CLOCK_TOLERANCE_SEC || '5'),
  },
};
