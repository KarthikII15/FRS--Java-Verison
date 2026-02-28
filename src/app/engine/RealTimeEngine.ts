import { Device, FacilityEvent, LiveOfficePresence, DeviceAlert, mockDevices, mockLivePresence, mockDeviceAlerts } from '../data/enhancedMockData';

// Event Types
export enum RteEventType {
    DEVICE_HEARTBEAT = 'DEVICE_HEARTBEAT',
    DEVICE_STATUS_CHANGE = 'DEVICE_STATUS_CHANGE',
    EMPLOYEE_ENTRY = 'EMPLOYEE_ENTRY',
    EMPLOYEE_EXIT = 'EMPLOYEE_EXIT',
    DEVICE_ALERT = 'DEVICE_ALERT',
    AREA_OCCUPANCY_CHANGE = 'AREA_OCCUPANCY_CHANGE'
}

type EventCallback = (payload: any) => void;

class RealTimeEngine {
    private static instance: RealTimeEngine;
    private listeners: Map<RteEventType, Set<EventCallback>> = new Map();

    // Simulated State
    private devices: Map<string, Device> = new Map();
    private presenceMap: Map<string, LiveOfficePresence> = new Map();
    private activeEvents: FacilityEvent[] = [];
    private activeAlerts: DeviceAlert[] = [];

    // Timers
    private heartbeatTimer: any = null;
    private eventTimer: any = null;

    private constructor() {
        this.initializeState();
    }

    public static getInstance(): RealTimeEngine {
        if (!RealTimeEngine.instance) {
            RealTimeEngine.instance = new RealTimeEngine();
        }
        return RealTimeEngine.instance;
    }

    private initializeState() {
        mockDevices.forEach(d => this.devices.set(d.id, { ...d }));
        mockLivePresence.forEach(p => this.presenceMap.set(p.employeeId, { ...p }));
        this.activeAlerts = [...mockDeviceAlerts];
    }

    public start() {
        if (this.heartbeatTimer) return;

        console.log('[RealTimeEngine] Starting simulation engine...');

        // Heartbeat every 3 seconds
        this.heartbeatTimer = setInterval(() => this.simulateHeartbeats(), 3000);

        // Random events every 5-8 seconds
        this.eventTimer = setInterval(() => this.simulateRandomEvent(), 5000 + Math.random() * 3000);
    }

    public stop() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        if (this.eventTimer) clearInterval(this.eventTimer);
        this.heartbeatTimer = null;
        this.eventTimer = null;
        console.log('[RealTimeEngine] Stopped simulation engine.');
    }

    // --- Pub/Sub ---
    public subscribe(eventType: RteEventType, callback: EventCallback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)!.add(callback);
        return () => this.unsubscribe(eventType, callback);
    }

    public unsubscribe(eventType: RteEventType, callback: EventCallback) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType)!.delete(callback);
        }
    }

    private emit(eventType: RteEventType, payload: any) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType)!.forEach(cb => cb(payload));
        }
    }

    // --- Simulators ---
    private simulateHeartbeats() {
        const updatedDevices: Device[] = [];

        this.devices.forEach(device => {
            if (device.type === 'Edge Device' || device.cpuUsage !== undefined) {
                // Fluctuate CPU/Mem/Temp slightly
                const fluctuate = (val: number, max: number) => Math.max(0, Math.min(max, val + (Math.random() * 4 - 2)));

                device.cpuUsage = fluctuate(device.cpuUsage || 40, 100);
                device.memoryUsage = fluctuate(device.memoryUsage || 50, 100);
                device.temperature = fluctuate(device.temperature || 45, 90);

                // Randomly generate an overheating alert if temp > 80
                if (device.temperature > 80 && !this.activeAlerts.find(a => a.deviceId === device.id && a.type === 'Overheating' && !a.resolved)) {
                    const alert: DeviceAlert = {
                        id: `alt-${Date.now()}`,
                        deviceId: device.id,
                        deviceName: device.name,
                        floorName: device.floorId || 'Unknown',
                        type: 'Overheating',
                        severity: 'Critical',
                        timestamp: new Date().toISOString(),
                        resolved: false,
                        message: `Critial temperature threshold exceeded: ${device.temperature.toFixed(1)}°C`
                    };
                    this.activeAlerts = [alert, ...this.activeAlerts];
                    this.emit(RteEventType.DEVICE_ALERT, alert);
                }
            }

            // Randomly toggle online/offline rarely (1% chance)
            if (Math.random() < 0.01) {
                device.status = device.status === 'Online' ? 'Offline' : 'Online';
                this.emit(RteEventType.DEVICE_STATUS_CHANGE, { deviceId: device.id, status: device.status });
            }
            updatedDevices.push({ ...device });
        });

        this.emit(RteEventType.DEVICE_HEARTBEAT, updatedDevices);
    }

    private simulateRandomEvent() {
        const devicesArray = Array.from(this.devices.values()).filter(d => d.status === 'Online');
        if (devicesArray.length === 0) return;

        const randomDevice = devicesArray[Math.floor(Math.random() * devicesArray.length)];
        const isEntry = Math.random() > 0.5;
        const employeeId = `emp-00${Math.floor(Math.random() * 9) + 1}`;

        const event: FacilityEvent = {
            id: `evt-sim-${Date.now()}`,
            type: isEntry ? 'entry' : 'exit',
            employeeId,
            employeeName: `Simulated Employee ${employeeId.split('-')[1]}`,
            cameraId: randomDevice.id,
            cameraName: randomDevice.name,
            floorId: randomDevice.floorId || 'fl-001',
            timestamp: new Date().toISOString(),
            coordinates: randomDevice.coordinates || { x: 50, y: 50 }
        };

        // Update presence
        const presence = this.presenceMap.get(employeeId) || {
            employeeId,
            employeeName: event.employeeName,
            department: 'Operations',
            checkInTime: new Date().toLocaleTimeString(),
            duration: '0h 0m',
            location: randomDevice.location,
            deviceUsed: randomDevice.name,
            status: 'Present',
            shiftEndTime: '17:00',
            lastSeenCamera: randomDevice.name,
            lastSeenTime: new Date().toLocaleTimeString(),
            entryCamera: randomDevice.name,
            floor: randomDevice.floorId,
            area: randomDevice.areaId || ''
        };

        if (isEntry) {
            presence.lastSeenCamera = randomDevice.name;
            presence.lastSeenTime = new Date().toLocaleTimeString();
            presence.status = 'Present';
            this.presenceMap.set(employeeId, presence);
            this.emit(RteEventType.EMPLOYEE_ENTRY, event);
        } else {
            presence.status = 'Checked-In Only';
            presence.checkOutTime = new Date().toLocaleTimeString();
            this.presenceMap.set(employeeId, presence);
            this.emit(RteEventType.EMPLOYEE_EXIT, event);
        }

        this.activeEvents = [event, ...this.activeEvents].slice(0, 50); // Keep last 50 events

        // Re-schedule next event with random delay
        if (this.eventTimer) clearInterval(this.eventTimer);
        this.eventTimer = setInterval(() => this.simulateRandomEvent(), 5000 + Math.random() * 5000);
    }

    // --- Getters ---
    public getDevices() { return Array.from(this.devices.values()); }
    public getPresence() { return Array.from(this.presenceMap.values()); }
    public getEvents() { return [...this.activeEvents]; }
    public getAlerts() { return [...this.activeAlerts]; }

    public addDevice(device: Device) {
        this.devices.set(device.id, device);
        this.emit(RteEventType.DEVICE_STATUS_CHANGE, { deviceId: device.id, status: device.status });
    }

    public checkoutEmployee(employeeId: string) {
        const presence = this.presenceMap.get(employeeId);
        if (presence) {
            presence.status = 'Checked-In Only';
            presence.checkOutTime = new Date().toLocaleTimeString();
            this.presenceMap.set(employeeId, presence);

            const event: FacilityEvent = {
                id: `evt-manual-${Date.now()}`,
                type: 'exit',
                employeeId,
                employeeName: presence.employeeName,
                cameraId: 'dev-manual',
                cameraName: 'System Checkout',
                floorId: presence.floor || 'Unknown',
                timestamp: new Date().toISOString(),
                coordinates: { x: 50, y: 50 }
            };
            this.activeEvents = [event, ...this.activeEvents].slice(0, 50);
            this.emit(RteEventType.EMPLOYEE_EXIT, event);
        }
    }
}

export const realtimeEngine = RealTimeEngine.getInstance();
// Start engine immediately for the demo
realtimeEngine.start();
