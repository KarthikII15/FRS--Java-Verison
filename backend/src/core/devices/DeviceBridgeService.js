import EventEmitter from 'events';
import DeviceAdapterFactory from '../devices/DeviceAdapterFactory.js';
import validationService from '../services/ValidationService.js';
import shutdownManager from '../managers/ShutdownManager.js';

/**
 * DeviceBridgeService — Connects device adapters to the existing pipeline.
 * 
 * This is the glue layer between the Device Abstraction Layer and the
 * existing backend pipeline (ValidationService → InferenceProcessor → Rules).
 * 
 * Responsibilities:
 *   - Manages active device adapter instances
 *   - Routes frames from any adapter → ValidationService
 *   - Routes NUC detections directly → Rules Engine (bypassing inference)
 *   - Handles device lifecycle (register, start, stop, status)
 *   - Registers devices with ShutdownManager for graceful cleanup
 */
class DeviceBridgeService extends EventEmitter {
    constructor() {
        super();
        this.adapters = new Map();  // deviceId → adapter instance
        this.initialized = false;

        shutdownManager.registerShutdownHandler('deviceBridge', async () => {
            await this.shutdownAll();
        });
    }

    /**
     * Initialize the bridge service.
     */
    async initialize() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('[DeviceBridgeService] Initialized');
    }

    /**
     * Register and start a new device.
     * @param {string} deviceType - 'webcam' | 'rtsp' | 'cctv' | 'nuc' | 'lpu'
     * @param {Object} config     - Device-specific configuration
     * @returns {Object} Device info
     */
    async registerDevice(deviceType, config = {}) {
        const adapter = DeviceAdapterFactory.create(deviceType, config);
        const deviceId = adapter.deviceId;

        // Check for duplicates
        if (this.adapters.has(deviceId)) {
            throw new Error(`Device already registered: ${deviceId}`);
        }

        // Wire adapter events to the pipeline
        this._wireAdapterEvents(adapter);

        // Create a camera queue in ShutdownManager
        shutdownManager.createCameraQueue(deviceId, config.queueSize || 100);

        // Store the adapter
        this.adapters.set(deviceId, adapter);

        console.log(`[DeviceBridgeService] Registered device: ${deviceId} (${deviceType})`);

        return adapter.getDeviceInfo();
    }

    /**
     * Start a registered device.
     * @param {string} deviceId
     */
    async startDevice(deviceId) {
        const adapter = this._getAdapter(deviceId);
        await adapter.start();
        console.log(`[DeviceBridgeService] Started device: ${deviceId}`);
        return adapter.getDeviceInfo();
    }

    /**
     * Stop a registered device.
     * @param {string} deviceId
     */
    async stopDevice(deviceId) {
        const adapter = this._getAdapter(deviceId);
        await adapter.stop();
        console.log(`[DeviceBridgeService] Stopped device: ${deviceId}`);
        return adapter.getDeviceInfo();
    }

    /**
     * Unregister and remove a device completely.
     * @param {string} deviceId
     */
    async removeDevice(deviceId) {
        const adapter = this._getAdapter(deviceId);

        if (adapter.isActive()) {
            await adapter.stop();
        }

        adapter.removeAllListeners();
        this.adapters.delete(deviceId);

        console.log(`[DeviceBridgeService] Removed device: ${deviceId}`);
    }

    /**
     * Route an externally received frame to the correct adapter.
     * Called by the HTTP frame ingestion endpoints.
     * @param {string} deviceId
     * @param {Buffer|string} frameData
     * @param {Object} metadata
     */
    async routeFrame(deviceId, frameData, metadata = {}) {
        const adapter = this.adapters.get(deviceId);

        if (adapter && typeof adapter.receiveFrame === 'function') {
            // Route through the adapter (which emits 'frame' → pipeline)
            adapter.receiveFrame(frameData, metadata);
        } else {
            // No adapter registered — still feed directly into validation
            // This supports legacy HTTP frame ingestion from unknown devices
            await validationService.validateAndQueueFrame(deviceId, frameData, {
                ...metadata,
                source: 'direct-http',
                timestamp: new Date().toISOString(),
            });
        }
    }

    /**
     * Route NUC detection results directly (bypass inference).
     * @param {string} deviceId
     * @param {Object} detectionPayload
     */
    async routeDetections(deviceId, detectionPayload) {
        const adapter = this.adapters.get(deviceId);

        if (adapter && typeof adapter.receiveDetections === 'function') {
            adapter.receiveDetections(detectionPayload);
        } else {
            // Emit directly for rule processing
            this.emit('edgeDetections', {
                cameraId: deviceId,
                ...detectionPayload,
                timestamp: new Date().toISOString(),
            });
        }
    }

    /**
     * Get info for a specific device.
     * @param {string} deviceId
     * @returns {Object}
     */
    getDeviceInfo(deviceId) {
        const adapter = this._getAdapter(deviceId);
        return adapter.getDeviceInfo();
    }

    /**
     * List all registered devices.
     * @returns {Object[]}
     */
    listDevices() {
        return Array.from(this.adapters.values()).map(a => a.getDeviceInfo());
    }

    /**
     * Get system-wide device stats.
     */
    getStats() {
        const devices = this.listDevices();
        return {
            totalDevices: devices.length,
            activeDevices: devices.filter(d => d.status === 'online').length,
            byType: devices.reduce((acc, d) => {
                acc[d.deviceType] = (acc[d.deviceType] || 0) + 1;
                return acc;
            }, {}),
            devices,
        };
    }

    /**
     * Shutdown all devices gracefully.
     */
    async shutdownAll() {
        console.log('[DeviceBridgeService] Shutting down all devices...');
        const stopPromises = Array.from(this.adapters.values())
            .filter(a => a.isActive())
            .map(a => a.stop().catch(err =>
                console.error(`[DeviceBridgeService] Error stopping ${a.deviceId}:`, err)
            ));

        await Promise.allSettled(stopPromises);
        this.adapters.clear();
        console.log('[DeviceBridgeService] All devices shut down.');
    }

    // ──────────────────────────────
    //  Private helpers
    // ──────────────────────────────

    _getAdapter(deviceId) {
        const adapter = this.adapters.get(deviceId);
        if (!adapter) {
            throw new Error(`Device not found: ${deviceId}`);
        }
        return adapter;
    }

    /**
     * Wire adapter events into the existing pipeline.
     */
    _wireAdapterEvents(adapter) {
        const deviceId = adapter.deviceId;

        // Frame event → ValidationService → InferenceProcessor → Rules
        adapter.on('frame', async (data) => {
            try {
                await validationService.validateAndQueueFrame(
                    data.cameraId,
                    data.frame,
                    {
                        ...data.metadata,
                        timestamp: data.timestamp,
                        source: adapter.deviceType,
                    }
                );
            } catch (error) {
                console.error(`[DeviceBridgeService] Frame routing error for ${deviceId}:`, error.message);
            }
        });

        // NUC detection event → bypass inference, go to rules directly
        adapter.on('detection', (data) => {
            this.emit('edgeDetections', data);
        });

        // Status changes → log and emit
        adapter.on('status', (data) => {
            console.log(`[DeviceBridgeService] Device ${data.cameraId}: ${data.previousStatus} → ${data.status}`);
            this.emit('deviceStatus', data);
        });

        // Errors → log
        adapter.on('error', (data) => {
            console.error(`[DeviceBridgeService] Device ${data.cameraId} error:`, data.error);
            this.emit('deviceError', data);
        });
    }
}

// Singleton
const deviceBridgeService = new DeviceBridgeService();
export default deviceBridgeService;
