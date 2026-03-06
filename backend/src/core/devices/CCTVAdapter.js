import BaseDeviceAdapter from './BaseDeviceAdapter.js';

/**
 * CCTVAdapter — Adapter for CCTV cameras streaming via RTSP.
 * 
 * FUTURE INTEGRATION STUB
 * ========================
 * This adapter will handle RTSP stream ingestion from IP cameras.
 * When CCTV cameras are deployed, implement the following:
 * 
 * 1. Use an RTSP client library (e.g., node-rtsp-stream, ffmpeg) to connect
 *    to the camera's RTSP URL and decode frames.
 * 2. OR deploy a lightweight edge script on each camera/NVR that captures
 *    frames and POSTs them to `/api/frames/rtsp/:cameraId` (recommended).
 * 
 * Configuration example:
 *   {
 *     deviceId: 'cctv-lobby-01',
 *     rtspUrl: 'rtsp://admin:password@192.168.1.100:554/stream1',
 *     fps: 10,
 *     resolution: '1920x1080',
 *     location: 'Main Entrance',
 *     direction: 'IN'
 *   }
 * 
 * The adapter follows the same BaseDeviceAdapter interface, so it plugs
 * directly into the DeviceBridgeService without any pipeline changes.
 */
class CCTVAdapter extends BaseDeviceAdapter {
    /**
     * @param {Object} config
     * @param {string} config.rtspUrl     - RTSP stream URL
     * @param {string} [config.location]  - Physical location description
     * @param {string} [config.direction] - 'IN' | 'OUT' | 'BOTH'
     * @param {string} [config.resolution]
     */
    constructor(config = {}) {
        super({
            ...config,
            deviceType: 'rtsp',
            name: config.name || `CCTV-${config.deviceId || 'unknown'}`,
            metadata: {
                rtspUrl: config.rtspUrl || null,
                location: config.location || 'Unknown',
                direction: config.direction || 'BOTH',
                resolution: config.resolution || '1920x1080',
                protocol: 'rtsp',
                ...config.metadata,
            },
        });

        this._rtspUrl = config.rtspUrl || null;
        this._streamProcess = null;
    }

    /**
     * Start consuming the RTSP stream.
     * TODO: Implement actual RTSP stream connection.
     */
    async start() {
        if (!this._rtspUrl) {
            throw new Error(`[CCTVAdapter] No RTSP URL configured for device ${this.deviceId}`);
        }

        this.setStatus('connecting');

        // ──────────────────────────────────────────────────
        // FUTURE IMPLEMENTATION:
        // 
        // Option A: Use ffmpeg to decode RTSP stream
        //   const ffmpeg = spawn('ffmpeg', [
        //     '-i', this._rtspUrl,
        //     '-f', 'image2pipe',
        //     '-vf', `fps=${this.fps}`,
        //     '-vcodec', 'mjpeg',
        //     'pipe:1'
        //   ]);
        //   ffmpeg.stdout.on('data', (frameData) => {
        //     this.emitFrame(frameData, { source: 'rtsp-ffmpeg' });
        //   });
        //
        // Option B: External edge agent POSTs frames to API
        //   (same as webcam approach — recommended for production)
        // ──────────────────────────────────────────────────

        console.log(`[CCTVAdapter] STUB: Device ${this.deviceId} — RTSP integration not yet implemented.`);
        console.log(`[CCTVAdapter] RTSP URL: ${this._rtspUrl}`);
        console.log(`[CCTVAdapter] When ready, deploy an edge agent that POSTs frames to /api/frames/rtsp/${this.deviceId}`);

        this.setStatus('online');
        this._startedAt = new Date().toISOString();

        this.emit('started', {
            cameraId: this.deviceId,
            timestamp: this._startedAt,
            message: 'CCTV adapter stub is online. Awaiting RTSP implementation or external frame source.',
        });
    }

    /**
     * Stop the RTSP stream consumption.
     */
    async stop() {
        if (this._streamProcess) {
            this._streamProcess.kill('SIGTERM');
            this._streamProcess = null;
        }

        this.setStatus('stopped');
        this._startedAt = null;

        this.emit('stopped', {
            cameraId: this.deviceId,
            timestamp: new Date().toISOString(),
        });

        console.log(`[CCTVAdapter] Device ${this.deviceId} stopped.`);
    }

    /**
     * Health check — ping the RTSP URL or check stream process.
     */
    async healthCheck() {
        // TODO: Implement actual RTSP health check (e.g., RTSP OPTIONS request)
        return this._status === 'online';
    }

    /**
     * Receive a frame externally (e.g., from an edge agent POST).
     * Same pattern as WebcamAdapter for consistency.
     */
    receiveFrame(frameData, metadata = {}) {
        this._frameCount++;
        this._lastFrameAt = new Date().toISOString();

        this.emitFrame(frameData, {
            receivedAt: this._lastFrameAt,
            ...metadata,
        });
    }
}

export default CCTVAdapter;
