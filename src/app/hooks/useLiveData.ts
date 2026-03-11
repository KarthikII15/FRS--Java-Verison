import { useState, useEffect } from 'react';
import { apiRequest } from '../services/http/apiClient';
import { Employee, AttendanceRecord, Device } from '../types';
import { DeviceAlert, mockEmployees, mockDevices, mockAlerts } from '../data/enhancedMockData';
import { mockAttendanceRecords } from '../utils/mockData';
import { ivisApi } from '../services/ivisApi';
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

                const today = new Date();
                const todayStr = today.toISOString().slice(0, 10);

                const [ivisEmployeesRes, ivisAttendanceRes, ivisSitesRes] = await Promise.all([
                    ivisApi.employees(),
                    ivisApi.frsEmployeeStats({
                        toTime: `${todayStr} 23:59:59`,
                        staffName: '',
                        siteName: '',
                        cameraIds: '',
                    }),
                    ivisApi.siteDetailsDropdown(),
                ]);

                const siteNameById = new Map(
                    (ivisSitesRes?.results ?? []).map((s) => [String(s.siteId), s.siteName])
                );

                const ivisEmployees = (ivisEmployeesRes?.results ?? []).map((emp) => {
                    const fullName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.userName || emp.employeeId;
                    const location = siteNameById.get(String(emp.siteId)) ?? 'IVIS';
                    return {
                        id: String(emp.pkUserId),
                        name: fullName,
                        email: '',
                        department: 'IVIS',
                        position: '—',
                        employeeId: emp.employeeId ?? String(emp.pkUserId),
                        shift: 'flexible',
                        location,
                        joinDate: new Date(),
                        avatar: emp.imageUrl ?? undefined,
                        status: emp.status ? 'active' : 'inactive',
                    } as Employee;
                });

                const attendanceByName = new Map(
                    ivisEmployees.map((e) => [e.name.toLowerCase(), e.employeeId])
                );

                const ivisAttendance = (ivisAttendanceRes?.results ?? []).map((rec, idx) => {
                    const nameKey = (rec.eventDate ?? '').toLowerCase();
                    const employeeId = attendanceByName.get(nameKey) ?? `ivis-${idx}`;
                    const hasEntry = (rec.entryCount ?? 0) > 0;
                    const hasExit = (rec.exitCount ?? 0) > 0;
                    const status = hasEntry ? 'present' : 'absent';

                    return {
                        id: `${employeeId}-${todayStr}`,
                        employeeId,
                        date: new Date(todayStr),
                        checkIn: hasEntry ? new Date(`${todayStr}T09:00:00`) : undefined,
                        checkOut: hasExit ? new Date(`${todayStr}T18:00:00`) : undefined,
                        status,
                        workingHours: hasEntry ? 8 : 0,
                        breakDuration: 0,
                        overtime: 0,
                        isLate: false,
                        isEarlyDeparture: false,
                        recognitionAccuracy: rec.total ?? 0,
                    } as AttendanceRecord;
                });

                if (isMounted) {
                    setData({
                        employees: ivisEmployees,
                        attendance: ivisAttendance,
                        devices: mockDevices as any,
                        alerts: mockAlerts as any,
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
