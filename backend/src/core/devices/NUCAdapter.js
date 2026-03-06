import BaseDeviceAdapter from './BaseDeviceAdapter.js';

/**
 * NUCAdapter — Adapter for NVIDIA NUC edge compute devices and LPU units.
 * 
 * FUTURE INTEGRATION STUB
 * ========================
 * NVIDIA NUCs will run AI inference locally on the edge and send pre-processed
 * detection results (not raw frames) to the backend. This is fundamentally
 * different from Webcam/CCTV adapters:
 * 
 *   Webcam/CCTV: Sends raw frames → backend does inference
 *   NUC/LPU:     Does inference locally → sends detection results to backend
 * 
 * Configuration example:
 *   {
 *     deviceId: 'nuc-entrance-01',
 *     nucApiUrl: 'http://192.168.1.200:8000',
 *     inferenceModel: 'face-recognition-v2',
 *     location: 'Main Entrance',
 *     capabilities: ['face_detection', 'face_recognition', 'person_tracking']
 *   }
 * 
 * The NUC will POST detection results to:
 *   POST /api/devices/:deviceId/detections
 *   {
 *     detections: [
 *       { type: 'face', confidence: 0.95, bbox: [x,y,w,h], embedding: [...] },
 *       { type: 'person', confidence: 0.88, bbox: [x,y,w,h], trackId: 'T-42' }
 *     ],
 *     frameMetadata: { timestamp, frameNumber, resolution },
 *     inferenceTime: 45  // ms
 *   }
 * 
 * This skips the backend's ModelManager inference step since NUC already
 * ran the models. The detections go directly to the Rules Engine.
 */
class NUCAdapter extends BaseDeviceAdapter {
    /**
     * @param {Object} config
     * @param {string} config.nucApiUrl       - NUC's local API URL
     * @param {string} [config.inferenceModel]- Model running on the NUC
     * @param {string} [config.location]      - Physical location
     * @param {Array}  [config.capabilities]  - Supported detection types
     */
    constructor(config = {}) {
        super({
            ...config,
            deviceType: 'nuc',
            name: config.name || `NUC-${config.deviceId || 'unknown'}`,
            metadata: {
                nucApiUrl: config.nucApiUrl || null,
                inferenceModel: config.inferenceModel || null,
                location: config.location || 'Unknown',
                capabilities: config.capabilities || [],
                edgeInference: true, // Key differentiator: inference happens on-device
                ...config.metadata,
            },
        });

        this._nucApiUrl = config.nucApiUrl || null;
        this._detectionCount = 0;
        this._lastDetectionAt = null;
    }

    /**
     * Start the NUC adapter.
     * Registers with the NUC's API to begin receiving detection results.
     * TODO: Implement NUC API handshake + webhook registration.
     */
    async start() {
        this.setStatus('connecting');

        // ──────────────────────────────────────────────────
        // FUTURE IMPLEMENTATION:
        //
        // 1. Register this backend as a webhook endpoint with the NUC:
        //    POST {nucApiUrl}/register-webhook
        //    { callbackUrl: 'http://backend:8080/api/devices/{deviceId}/detections' }
        //
        // 2. Configure the NUC's inference pipeline:
        //    POST {nucApiUrl}/configure
        //    { model: 'face-recognition-v2', fps: 10, minConfidence: 0.7 }
        //
        // 3. Start the NUC's capture + inference loop:
        //    POST {nucApiUrl}/start
        // ──────────────────────────────────────────────────

        console.log(`[NUCAdapter] STUB: Device ${this.deviceId} — NUC integration not yet implemented.`);
        console.log(`[NUCAdapter] When ready, the NUC should POST detection results to /api/devices/${this.deviceId}/detections`);

        this.setStatus('online');
        this._startedAt = new Date().toISOString();

        this.emit('started', {
            cameraId: this.deviceId,
            timestamp: this._startedAt,
            message: 'NUC adapter stub is online. Awaiting NUC hardware + API integration.',
        });
    }

    /**
     * Stop the NUC adapter and de-register webhook.
     */
    async stop() {
        // TODO: POST {nucApiUrl}/stop and de-register webhook

        this.setStatus('stopped');
        this._startedAt = null;

        this.emit('stopped', {
            cameraId: this.deviceId,
            timestamp: new Date().toISOString(),
            totalDetections: this._detectionCount,
        });

        console.log(`[NUCAdapter] Device ${this.deviceId} stopped. Total detections: ${this._detectionCount}`);
    }

    /**
     * Health check — ping the NUC's health endpoint.
     */
    async healthCheck() {
        // TODO: GET {nucApiUrl}/health
        return this._status === 'online';
    }

    /**
     * Receive pre-processed detection results from the NUC.
     * Unlike Webcam/CCTV adapters, this receives detections, not raw frames.
     * @param {Object} detectionPayload
     * @param {Array}  detectionPayload.detections   - Array of detection objects
     * @param {Object} detectionPayload.frameMetadata- Capture metadata
     * @param {number} detectionPayload.inferenceTime- NUC-side inference time (ms)
     */
    receiveDetections(detectionPayload) {
        this._detectionCount++;
        this._lastDetectionAt = new Date().toISOString();

        // Emit as a special 'detection' event (not 'frame')
        // The DeviceBridgeService will route this directly to the Rules Engine,
        // bypassing the ModelManager inference step.
        this.emit('detection', {
            cameraId: this.deviceId,
            detections: detectionPayload.detections || [],
            frameMetadata: detectionPayload.frameMetadata || {},
            inferenceTime: detectionPayload.inferenceTime || 0,
            edgeProcessed: true,
            timestamp: this._lastDetectionAt,
        });
    }

    /**
     * NUC can also receive raw frames if needed (fallback mode).
     */
    receiveFrame(frameData, metadata = {}) {
        this._frameCount++;
        this._lastFrameAt = new Date().toISOString();

        this.emitFrame(frameData, {
            receivedAt: this._lastFrameAt,
            fallbackMode: true, // Indicates NUC sent raw frame instead of detections
            ...metadata,
        });
    }
}

export default NUCAdapter;
