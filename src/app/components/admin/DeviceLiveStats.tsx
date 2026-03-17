import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import {
    Scan,
    HelpCircle,
    Zap,
    Thermometer,
    Signal
} from 'lucide-react';
import { cn } from '../ui/utils';
import { realtimeEngine, RteEventType } from '../../engine/RealTimeEngine';
import { apiRequest } from '../../services/http/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useScopeHeaders } from '../../hooks/useScopeHeaders';

interface LiveStats {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    recognitionsToday: number;
    unknownFacesToday: number;
    avgConfidence: number;
    deviceList: any[];
}

export const DeviceLiveStats: React.FC = () => {
    const { accessToken } = useAuth();
    const scopeHeaders = useScopeHeaders();
    const [stats, setStats] = useState<LiveStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const data = await apiRequest<LiveStats>('/devices/live-stats', {
                accessToken,
                scopeHeaders
            });
            setStats(data);
        } catch (err) {
            console.error('[DeviceLiveStats] Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [accessToken, scopeHeaders]);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10000);

        const handleHeartbeat = (updatedDevices: any[]) => {
            setStats(prev => {
                if (!prev) return prev;
                const online = updatedDevices.filter(d => d.status === 'Online').length;
                const offline = updatedDevices.length - online;

                // Update specific metrics in the list if they match
                const newList = prev.deviceList.map(existing => {
                    const latest = updatedDevices.find(d => d.id === existing.id);
                    if (latest) {
                        return {
                            ...existing,
                            status: latest.status,
                            cpuUsage: latest.cpuUsage,
                            memoryUsage: latest.memoryUsage,
                            temperature: latest.temperature,
                            fpsActual: latest.fpsActual
                        };
                    }
                    return existing;
                });

                return {
                    ...prev,
                    onlineDevices: online,
                    offlineDevices: offline,
                    deviceList: newList
                };
            });
        };

        const unsubscribe = realtimeEngine.subscribe(RteEventType.DEVICE_HEARTBEAT, handleHeartbeat);

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchStats]);

    const maxTemp = useMemo(() => {
        if (!stats?.deviceList?.length) return 0;
        return Math.max(...stats.deviceList.map(d => d.temperature || 0));
    }, [stats?.deviceList]);

    const avgFps = useMemo(() => {
        if (!stats?.deviceList?.length) return '0.0';
        const devicesWithFps = stats.deviceList.filter(d => d.fpsActual !== undefined);
        if (devicesWithFps.length === 0) return '0.0';
        return (devicesWithFps.reduce((sum, d) => sum + (d.fpsActual || 0), 0) / devicesWithFps.length).toFixed(1);
    }, [stats?.deviceList]);

    if (!stats && loading) {
        return <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
        </div>;
    }

    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
                label="Online Status"
                value={`${stats.onlineDevices}/${stats.totalDevices}`}
                icon={Signal}
                color={stats.offlineDevices > 0 ? "amber" : "emerald"}
                pulse={stats.offlineDevices === 0}
            />
            <MetricCard
                label="Recognised Today"
                value={stats.recognitionsToday}
                icon={Scan}
                color="blue"
            />
            <MetricCard
                label="Unknown Faces"
                value={stats.unknownFacesToday}
                icon={HelpCircle}
                color="indigo"
            />
            <MetricCard
                label="Avg Processing FPS"
                value={avgFps}
                icon={Zap}
                color="purple"
            />
            <MetricCard
                label="Max System Temp"
                value={`${maxTemp.toFixed(1)}°C`}
                icon={Thermometer}
                color={maxTemp > 75 ? "rose" : "orange"}
            />
        </div>
    );
};

const MetricCard = ({ label, value, icon: Icon, color, pulse }: any) => {
    const colorClasses: any = {
        emerald: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400",
        amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/5 dark:text-amber-400",
        blue: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400",
        indigo: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/5 dark:text-indigo-400",
        purple: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/5 dark:text-purple-400",
        rose: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/5 dark:text-rose-400",
        orange: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/5 dark:text-orange-400",
    };

    const dotClasses: any = {
        emerald: "bg-emerald-500",
        amber: "bg-amber-500",
        blue: "bg-blue-500",
        indigo: "bg-indigo-500",
        purple: "bg-purple-500",
        rose: "bg-rose-500",
        orange: "bg-orange-500",
    };

    return (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center relative",
                    colorClasses[color]
                )}>
                    <Icon className="w-6 h-6" />
                    {pulse && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotClasses[color])}></span>
                            <span className={cn("relative inline-flex rounded-full h-3 w-3", dotClasses[color])}></span>
                        </span>
                    )}
                </div>
                <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1.5">{label}</div>
                </div>
            </CardContent>
        </Card>
    );
};
