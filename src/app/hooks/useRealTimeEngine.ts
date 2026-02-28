import { useState, useEffect } from 'react';
import { realtimeEngine, RteEventType } from '../engine/RealTimeEngine';
import { Device, FacilityEvent, LiveOfficePresence, DeviceAlert } from '../data/enhancedMockData';

export function useRealTimeEngine() {
    const [devices, setDevices] = useState<Device[]>(realtimeEngine.getDevices());
    const [presence, setPresence] = useState<LiveOfficePresence[]>(realtimeEngine.getPresence());
    const [events, setEvents] = useState<FacilityEvent[]>(realtimeEngine.getEvents());
    const [alerts, setAlerts] = useState<DeviceAlert[]>(realtimeEngine.getAlerts());

    useEffect(() => {
        const handleHeartbeat = (updatedDevices: Device[]) => {
            setDevices(updatedDevices);
        };

        const handleStatusChange = () => {
            setDevices(realtimeEngine.getDevices());
        };

        const handleEntry = (event: FacilityEvent) => {
            setEvents(prev => [event, ...prev].slice(0, 50));
            setPresence(realtimeEngine.getPresence());
        };

        const handleExit = (event: FacilityEvent) => {
            setEvents(prev => [event, ...prev].slice(0, 50));
            setPresence(realtimeEngine.getPresence());
        };

        const handleAlert = (alert: DeviceAlert) => {
            setAlerts(prev => [alert, ...prev]);
        };

        realtimeEngine.subscribe(RteEventType.DEVICE_HEARTBEAT, handleHeartbeat);
        realtimeEngine.subscribe(RteEventType.DEVICE_STATUS_CHANGE, handleStatusChange);
        realtimeEngine.subscribe(RteEventType.EMPLOYEE_ENTRY, handleEntry);
        realtimeEngine.subscribe(RteEventType.EMPLOYEE_EXIT, handleExit);
        realtimeEngine.subscribe(RteEventType.DEVICE_ALERT, handleAlert);

        // Initial sync
        setDevices(realtimeEngine.getDevices());
        setPresence(realtimeEngine.getPresence());
        setEvents(realtimeEngine.getEvents());
        setAlerts(realtimeEngine.getAlerts());

        return () => {
            realtimeEngine.unsubscribe(RteEventType.DEVICE_HEARTBEAT, handleHeartbeat);
            realtimeEngine.unsubscribe(RteEventType.DEVICE_STATUS_CHANGE, handleStatusChange);
            realtimeEngine.unsubscribe(RteEventType.EMPLOYEE_ENTRY, handleEntry);
            realtimeEngine.unsubscribe(RteEventType.EMPLOYEE_EXIT, handleExit);
            realtimeEngine.unsubscribe(RteEventType.DEVICE_ALERT, handleAlert);
        };
    }, []);

    const addDevice = (device: Device) => {
        realtimeEngine.addDevice(device);
    };

    const checkoutEmployee = (employeeId: string) => {
        realtimeEngine.checkoutEmployee(employeeId);
    };

    return {
        devices,
        presence,
        events,
        alerts,
        addDevice,
        checkoutEmployee
    };
}
