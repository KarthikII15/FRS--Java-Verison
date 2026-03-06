import WebcamAdapter from './WebcamAdapter.js';
import CCTVAdapter from './CCTVAdapter.js';
import NUCAdapter from './NUCAdapter.js';

/**
 * DeviceAdapterFactory — Creates the appropriate adapter based on device type.
 * 
 * This is the single entry point for creating device adapters. When new device
 * types are added in the future, register them here.
 * 
 * Supported types:
 *   'webcam' → WebcamAdapter  (laptop camera via Python script)
 *   'rtsp'   → CCTVAdapter    (IP cameras via RTSP)
 *   'cctv'   → CCTVAdapter    (alias for rtsp)
 *   'nuc'    → NUCAdapter     (NVIDIA NUC edge compute)
 *   'lpu'    → NUCAdapter     (LPU devices — same interface as NUC)
 * 
 * Usage:
 *   const adapter = DeviceAdapterFactory.create('webcam', {
 *     deviceId: 'webcam-01',
 *     fps: 5,
 *     cameraIndex: 0
 *   });
 *   await adapter.start();
 */
class DeviceAdapterFactory {
    static _registry = {
        webcam: WebcamAdapter,
        rtsp: CCTVAdapter,
        cctv: CCTVAdapter,
        nuc: NUCAdapter,
        lpu: NUCAdapter,
    };

    /**
     * Create a device adapter instance.
     * @param {string} deviceType - One of: 'webcam', 'rtsp', 'cctv', 'nuc', 'lpu'
     * @param {Object} config     - Device-specific configuration
     * @returns {BaseDeviceAdapter}
     */
    static create(deviceType, config = {}) {
        const normalizedType = deviceType.toLowerCase().trim();
        const AdapterClass = DeviceAdapterFactory._registry[normalizedType];

        if (!AdapterClass) {
            const supported = Object.keys(DeviceAdapterFactory._registry).join(', ');
            throw new Error(
                `Unknown device type: '${deviceType}'. Supported types: ${supported}`
            );
        }

        return new AdapterClass(config);
    }

    /**
     * Register a custom adapter type (for extensibility).
     * @param {string} typeName
     * @param {typeof BaseDeviceAdapter} AdapterClass
     */
    static register(typeName, AdapterClass) {
        DeviceAdapterFactory._registry[typeName.toLowerCase()] = AdapterClass;
        console.log(`[DeviceAdapterFactory] Registered adapter type: ${typeName}`);
    }

    /**
     * List all supported device types.
     * @returns {string[]}
     */
    static getSupportedTypes() {
        return Object.keys(DeviceAdapterFactory._registry);
    }
}

export default DeviceAdapterFactory;
