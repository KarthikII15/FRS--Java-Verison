import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Scan, User, Clock, MapPin, ShieldAlert, History, Pause, Play } from 'lucide-react';
import { cn } from '../ui/utils';
import { apiRequest } from '../../services/http/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useScopeHeaders } from '../../hooks/useScopeHeaders';
import { realtimeEngine, RteEventType } from '../../engine/RealTimeEngine';

interface RecognitionEvent {
    id: string;
    eventType: 'EMPLOYEE_ENTRY' | 'FACE_DETECTED' | 'ERROR';
    employeeName?: string;
    employeeCode?: string;
    deviceName: string;
    location: string;
    confidence: number;
    similarity?: number;
    occurredAt: string;
    processingStatus: string;
}

export const RecognitionFeed: React.FC = () => {
    const { accessToken } = useAuth();
    const scopeHeaders = useScopeHeaders();
    const [events, setEvents] = useState<RecognitionEvent[]>([]);
    const [paused, setPaused] = useState(false);
    const [queuedEvents, setQueuedEvents] = useState<RecognitionEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Deduplication map
    const eventIds = useRef(new Set<string>());

    const fetchInitial = useCallback(async () => {
        try {
            const data = await apiRequest<{ events: RecognitionEvent[] }>('/devices/events/recent?limit=30', {
                accessToken,
                scopeHeaders
            });
            const newEvents = data.events.filter(e => !eventIds.current.has(e.id));
            newEvents.forEach(e => eventIds.current.add(e.id));
            setEvents(prev => [...newEvents, ...prev].slice(0, 50));
        } catch (err) {
            console.error('[RecognitionFeed] Initial fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [accessToken, scopeHeaders]);

    useEffect(() => {
        fetchInitial();

        const handleNewEvent = (payload: any) => {
            const event: RecognitionEvent = {
                id: payload.id || `ws-${Date.now()}-${Math.random()}`,
                eventType: payload.employeeId ? 'EMPLOYEE_ENTRY' : 'FACE_DETECTED',
                employeeName: payload.fullName || payload.employeeName,
                employeeCode: payload.employeeCode,
                deviceName: payload.deviceName || payload.deviceId,
                location: payload.location || '',
                confidence: payload.confidence || 0,
                similarity: payload.similarity,
                occurredAt: payload.timestamp || new Date().toISOString(),
                processingStatus: 'completed'
            };

            if (eventIds.current.has(event.id)) return;
            eventIds.current.add(event.id);

            if (paused) {
                setQueuedEvents(prev => [event, ...prev]);
            } else {
                setEvents(prev => [event, ...prev].slice(0, 50));
            }
        };

        const unsubEntry = realtimeEngine.subscribe(RteEventType.EMPLOYEE_ENTRY, handleNewEvent);
        const unsubUnknown = realtimeEngine.subscribe(RteEventType.DEVICE_ALERT, (alert) => {
            if (alert.type === 'UnknownFace') {
                handleNewEvent({
                    id: alert.id,
                    employeeName: 'Unknown Face',
                    deviceId: alert.deviceId,
                    deviceName: alert.deviceName,
                    confidence: 0, // alert doesn't always have confidence in payload
                    timestamp: alert.timestamp
                });
            }
        });

        return () => {
            unsubEntry();
            unsubUnknown();
        };
    }, [fetchInitial, paused]);

    const handleTogglePause = () => {
        if (paused) {
            // Releasing queue
            setEvents(prev => [...queuedEvents, ...prev].slice(0, 50));
            setQueuedEvents([]);
        }
        setPaused(!paused);
    };

    return (
        <Card className="shadow-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-[600px] overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-100 dark:border-slate-900 flex flex-row items-center justify-between pb-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
                        Live Recognition Feed
                    </CardTitle>
                    <span className="flex h-2 w-2 relative ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {queuedEvents.length > 0 && (
                        <Badge variant="destructive" className="animate-pulse text-[10px] px-1.5 h-5">
                            {queuedEvents.length} NEW
                        </Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 w-7 p-0", paused ? "text-blue-500" : "text-slate-400")}
                        onClick={handleTogglePause}
                    >
                        {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                {loading && !events.length ? (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
                        <span className="text-[10px] uppercase font-black tracking-[0.2em]">Syncing Feed...</span>
                    </div>
                ) : events.length === 0 ? (
                    <div className="p-20 text-center text-slate-400">
                        <Scan className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Activity Detected</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-900">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className="animate-in slide-in-from-right-4 fade-in duration-500"
                            >
                                <RecognitionItem event={event} />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const RecognitionItem = ({ event }: { event: RecognitionEvent }) => {
    const [relativeTime, setRelativeTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const then = new Date(event.occurredAt);
            const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

            if (diff < 60) setRelativeTime(`${diff}s ago`);
            else if (diff < 3600) setRelativeTime(`${Math.floor(diff / 60)}m ago`);
            else setRelativeTime(`${Math.floor(diff / 3600)}h ago`);
        };

        updateTime();
        const interval = setInterval(updateTime, 5000);
        return () => clearInterval(interval);
    }, [event.occurredAt]);

    const isUnknown = event.employeeName === 'Unknown Face' || event.eventType === 'FACE_DETECTED';
    const isError = event.eventType === 'ERROR';

    return (
        <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group">
            <div className="flex items-start gap-4">
                <div className={cn(
                    "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-sm",
                    isError ? "bg-rose-500 animate-pulse" :
                        isUnknown ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                            "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                )} />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className={cn(
                            "text-sm font-black truncate",
                            isUnknown ? "text-amber-600 dark:text-amber-400 italic" : "text-slate-900 dark:text-white"
                        )}>
                            {event.employeeName || 'Unrecognised Subject'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 shrink-0 tabular-nums">
                            {relativeTime}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 font-medium">
                            <MapPin className="w-2.5 h-2.5 text-blue-500" />
                            {event.location || event.deviceName}
                        </div>
                    </div>

                    {!isUnknown && event.similarity && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[8px] uppercase font-black tracking-tighter text-slate-400">
                                <span>Similarity Match</span>
                                <span>{(event.similarity * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-1000"
                                    style={{ width: `${event.similarity * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
