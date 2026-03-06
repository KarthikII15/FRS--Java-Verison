import BaseDeviceAdapter from './BaseDeviceAdapter.js';

/**
 * WebcamAdapter — Adapter for laptop/USB webcam input.
 * 
 * DESIGN NOTE: This adapter does NOT capture frames directly in Node.js.
 * Instead, it acts as a receiver for a companion Python script 
 * (`edge-devices/webcam/webcam_capture.py`) that captures webcam frames 
 * and POSTs them to the backend API.
 * 
 * This design mirrors how real edge devices (CCTV, NUC) will send data:
 *   Edge Device → HTTP POST /api/frames/rtsp/:cameraId → Backend Pipeline
 * 
 * The adapter manages the logical "device" state (online, offline) and
 * receives frames when the Python script sends them via the API.
 * 
 * Usage:
 *   const adapter = new WebcamAdapter({ deviceId: 'webcam-01', fps: 5 });
 *   await adapter.start();  // Marks device as online, ready to receive
 */
class WebcamAdapter extends BaseDeviceAdapter {
    /**
     * @param {Object} config
     * @param {string}  [config.deviceId]   - Unique ID (default: auto-generated)
     * @param {number}  [config.fps]        - Expected FPS from Python script
     * @param {number}  [config.cameraIndex]- OS camera device index (0 = default)
     * @param {string}  [config.resolution] - e.g. '640x480', '1280x720'
     */
    constructor(config = {}) {
        super({
            ...config,
            deviceType: 'webcam',
            name: config.name || `Webcam-${config.cameraIndex || 0}`,
            metadata: {
                cameraIndex: config.cameraIndex || 0,
                resolution: config.resolution || '640x480',
                captureMethod: 'external-python-script',
                ...config.metadata,
            },
        });

        this._receivedFrames = 0;
        this._lastReceivedAt = null;
    }

    /**
     * Start the webcam adapter.
     * This sets the device status to 'online', indicating that the adapter
     * is ready to receive frames from the companion Python script.
     */
    async start() {
        this.setStatus('connecting');

        try {
            // The webcam adapter itself does not capture frames.
            // It relies on an external Python script to POST frames to the API.
            // Here we simply mark the device as online and ready.
            this._startedAt = new Date().toISOString();
            this.setStatus('online');

            this.emit('started', {
                cameraId: this.deviceId,
                timestamp: this._startedAt,
                message: 'Webcam adapter is online. Start the Python webcam_capture.py script to begin sending frames.',
            });

            console.log(`[WebcamAdapter] Device ${this.deviceId} is online. Awaiting frames from external capture script.`);
        } catch (error) {
            this.setStatus('error');
            this.emitError(error);
            throw error;
        }
    }

    /**
     * Stop the webcam adapter and clean up.
     */
    async stop() {
        this.setStatus('stopped');
        this._startedAt = null;

        this.emit('stopped', {
            cameraId: this.deviceId,
            timestamp: new Date().toISOString(),
            totalFramesReceived: this._receivedFrames,
        });

        console.log(`[WebcamAdapter] Device ${this.deviceId} stopped. Total frames received: ${this._receivedFrames}`);
    }

    /**
     * Health check — considers the device healthy if it received a frame recently.
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        if (!this.isActive()) return false;

        // If no frames received in 10 seconds, consider unhealthy
        if (this._lastReceivedAt) {
            const elapsed = Date.now() - new Date(this._lastReceivedAt).getTime();
            return elapsed < 10000;
        }

        // If never received a frame, just check if online
        return this._status === 'online';
    }

    /**
     * Called when a frame is received via the HTTP API endpoint.
     * Routes the frame into the standard pipeline via emitFrame().
     * @param {Buffer|string} frameData
     * @param {Object} [metadata]
     */
    receiveFrame(frameData, metadata = {}) {
        this._receivedFrames++;
        this._lastReceivedAt = new Date().toISOString();

        this.emitFrame(frameData, {
            receivedAt: this._lastReceivedAt,
            frameIndex: this._receivedFrames,
            ...metadata,
        });
    }
}

export default WebcamAdapter;
