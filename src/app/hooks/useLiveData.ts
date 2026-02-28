import { useState, useEffect } from 'react';
import { apiRequest } from '../services/http/apiClient';
import { Employee, AttendanceRecord, Device } from '../types';
import { DeviceAlert, mockEmployees, mockDevices, mockAlerts } from '../data/enhancedMockData';
import { mockAttendanceRecords } from '../utils/mockData';
import { useAuth } from '../contexts/AuthContext';
import { useScopeHeaders } from './useScopeHeaders';
import { authConfig } from '../config/authConfig';


interface LiveDataState {
    employees: Employee[];
    attendance: AttendanceRecord[];
    devices: Device[];
    alerts: DeviceAlert[];
    isLoading: boolean;
    error: Error | null;
}

export function useLiveData() {
    const { accessToken } = useAuth();
    const scopeHeaders = useScopeHeaders();
    const [data, setData] = useState<LiveDataState>({

        employees: [],
        attendance: [],
        devices: [],
        alerts: [],
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        let isMounted = true;

        async function fetchLiveEnterpriseData() {
            // Fallback to high-fidelity mock data if we're not in API mode
            if (authConfig.mode === 'mock') {
                if (isMounted) {
                    setData({
                        employees: mockEmployees as any,
                        attendance: mockAttendanceRecords as any,
                        devices: mockDevices as any,
                        alerts: mockAlerts as any,
                        isLoading: false,
                        error: null,
                    });
                }
                return;
            }

            if (!accessToken) {
                if (isMounted) {
                    setData(prev => ({ ...prev, isLoading: false, error: new Error('Session required. Please log in to view live data.') }));
                }
                return;
            }

            try {
                if (isMounted) {
                    setData(prev => ({ ...prev, isLoading: true, error: null }));
                }

                const [employeesRes, attendanceRes, devicesRes, alertsRes] = await Promise.all([
                    apiRequest<{ data: Employee[] }>('/live/employees', { accessToken, scopeHeaders }),
                    apiRequest<{ data: AttendanceRecord[] }>('/live/attendance', { accessToken, scopeHeaders }),
                    apiRequest<{ data: Device[] }>('/live/devices', { accessToken, scopeHeaders }),
                    apiRequest<{ data: DeviceAlert[] }>('/live/alerts', { accessToken, scopeHeaders }),
                ]);


                if (isMounted) {
                    setData({
                        employees: employeesRes.data || [],
                        attendance: attendanceRes.data || [],
                        devices: devicesRes.data || [],
                        alerts: alertsRes.data || [],
                        isLoading: false,
                        error: null,
                    });
                }
            } catch (err) {
                console.error('[useLiveData] API Request failed:', err);
                if (isMounted) {
                    setData(prev => ({
                        ...prev,
                        isLoading: false,
                        error: err instanceof Error ? err : new Error('Backend connection failed. Is the server running?'),
                    }));
                }
            }
        }

        fetchLiveEnterpriseData();

        return () => {
            isMounted = false;
        };
    }, [accessToken, scopeHeaders]);

    return data;
}
