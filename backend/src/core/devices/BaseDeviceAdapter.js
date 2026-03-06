import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * BaseDeviceAdapter - Abstract base class for all device input sources.
 * 
 * All adapters (Webcam, CCTV/RTSP, NVIDIA NUC, LPU) must extend this class
 * and implement the required methods. This ensures a uniform interface so that
 * any device can be swapped into the pipeline without architectural changes.
 * 
 * Events emitted:
 *   - 'frame'   : { cameraId, frame (Buffer), metadata, timestamp }
 *   - 'status'  : { cameraId, status, previousStatus, timestamp }
 *   - 'error'   : { cameraId, error, timestamp }
 *   - 'started' : { cameraId, timestamp }
 *   - 'stopped' : { cameraId, timestamp }
 */
class BaseDeviceAdapter extends EventEmitter {
    /**
     * @param {Object} config
     * @param {string} config.deviceId   - Unique device identifier
     * @param {string} config.deviceType - 'webcam' | 'rtsp' | 'nuc' | 'lpu'
     * @param {string} [config.name]     - Human-readable device name
     * @param {number} [config.fps]      - Target frames per second (default: 5)
     * @param {Object} [config.metadata] - Additional device-specific config
     */
    constructor(config = {}) {
        super();

        if (new.target === BaseDeviceAdapter) {
            throw new Error('BaseDeviceAdapter is abstract and cannot be instantiated directly.');
        }

        this.deviceId = config.deviceId || `device-${uuidv4()}`;
        this.deviceType = config.deviceType || 'unknown';
        this.name = config.name || `${this.deviceType}-${this.deviceId.substring(0, 8)}`;
        this.fps = config.fps || 5;
        this.metadata = config.metadata || {};

        // Internal state
        this._status = 'disconnected'; // disconnected | connecting | online | error | stopped
        this._previousStatus = null;
        this._startedAt = null;
        this._frameCount = 0;
        this._errorCount = 0;
        this._lastFrameAt = null;
    }

    // ──────────────────────────────────────
    //  Abstract methods (must be overridden)
    // ──────────────────────────────────────

    /**
     * Start capturing frames from the device.
     * Must emit 'frame' events with { cameraId, frame, metadata, timestamp }.
     * @returns {Promise<void>}
     */
    async start() {
        throw new Error('start() must be implemented by subclass');
    }

    /**
     * Stop capturing frames and release device resources.
     * @returns {Promise<void>}
     */
    async stop() {
        throw new Error('stop() must be implemented by subclass');
    }

    /**
     * Check if the device is currently reachable/healthy.
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        throw new Error('healthCheck() must be implemented by subclass');
    }

    // ──────────────────────────────────────
    //  Concrete (shared) methods
    // ──────────────────────────────────────

    /**
     * Update device status and emit a 'status' event.
     * @param {'disconnected'|'connecting'|'online'|'error'|'stopped'} newStatus
     */
    setStatus(newStatus) {
        this._previousStatus = this._status;
        this._status = newStatus;

        this.emit('status', {
            cameraId: this.deviceId,
            status: newStatus,
            previousStatus: this._previousStatus,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Emit a standardized frame event (called by subclass implementations).
     * @param {Buffer|string} frameData - Raw image data or base64 string
     * @param {Object} [frameMeta]      - Additional per-frame metadata
     */
    emitFrame(frameData, frameMeta = {}) {
        this._frameCount++;
        this._lastFrameAt = new Date().toISOString();

        this.emit('frame', {
            cameraId: this.deviceId,
            frame: frameData,
            metadata: {
                deviceType: this.deviceType,
                deviceName: this.name,
                frameNumber: this._frameCount,
                fps: this.fps,
                source: this.deviceType,
                ...this.metadata,
                ...frameMeta,
            },
            timestamp: this._lastFrameAt,
        });
    }

    /**
     * Emit a standardized error event.
     * @param {Error} error
     */
    emitError(error) {
        this._errorCount++;

        this.emit('error', {
            cameraId: this.deviceId,
            error: error.message || error,
            stack: error.stack,
            errorCount: this._errorCount,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Get comprehensive device information.
     * @returns {Object}
     */
    getDeviceInfo() {
        return {
            deviceId: this.deviceId,
            deviceType: this.deviceType,
            name: this.name,
            status: this._status,
            fps: this.fps,
            metadata: this.metadata,
            stats: {
                frameCount: this._frameCount,
                errorCount: this._errorCount,
                startedAt: this._startedAt,
                lastFrameAt: this._lastFrameAt,
                uptime: this._startedAt
                    ? Date.now() - new Date(this._startedAt).getTime()
                    : 0,
            },
        };
    }

    /**
     * Get current device status.
     * @returns {string}
     */
    getStatus() {
        return this._status;
    }

    /**
     * Check if the device is actively capturing.
     * @returns {boolean}
     */
    isActive() {
        return this._status === 'online';
    }
}

export default BaseDeviceAdapter;
