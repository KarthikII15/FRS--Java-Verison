import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Scan, User, Clock, MapPin, ShieldAlert, History } from 'lucide-react';
import { cn } from '../ui/utils';
import { apiRequest } from '../../services/http/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useScopeHeaders } from '../../hooks/useScopeHeaders';
import { realtimeEngine, RteEventType } from '../../engine/RealTimeEngine';

export const RecentRecognitionFeed: React.FC = () => {
    const { accessToken } = useAuth();
    const scopeHeaders = useScopeHeaders();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        try {
            const data = await apiRequest<{ events: any[] }>('/devices/events/recent?limit=10', {
                accessToken,
                scopeHeaders
            });
            setEvents(data.events);
        } catch (err) {
            console.error('[RecentRecognitionFeed] Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [accessToken, scopeHeaders]);

    useEffect(() => {
        fetchEvents();

        // Instant update on new recognition
        const handleNewEntry = () => {
            fetchEvents();
        };

        const unsubscribe = realtimeEngine.subscribe(RteEventType.EMPLOYEE_ENTRY, handleNewEntry);

        return () => unsubscribe();
    }, [fetchEvents]);

    return (
        <Card className="shadow-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-full overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-100 dark:border-slate-900 flex flex-row items-center justify-between pb-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
                        Recent Activity
                    </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-blue-500 border-blue-500/30">LIVE</Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                {loading && !events.length ? (
                    <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
                        <span className="text-xs uppercase font-bold tracking-widest">Hydrating Feed...</span>
                    </div>
                ) : events.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Scan className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No Recent Activity</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-900">
                        {events.map((event) => (
                            <ActivityItem key={event.id} event={event} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const ActivityItem = ({ event }: { event: any }) => {
    const isUnknown = event.eventType === 'FACE_DETECTED';
    const time = new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group">
            <div className="flex items-start gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 shrink-0",
                    isUnknown
                        ? "bg-rose-50 border-rose-100 text-rose-500 dark:bg-rose-500/10 dark:border-rose-500/20"
                        : "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20"
                )}>
                    {isUnknown ? <ShieldAlert className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className={cn(
                            "text-sm font-black truncate",
                            isUnknown ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                        )}>
                            {isUnknown ? 'Unknown Face' : event.employeeName}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {time}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        {!isUnknown && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 uppercase dark:bg-slate-800 dark:text-slate-400 font-bold">{event.employeeCode}</Badge>}
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 font-medium">
                            <MapPin className="w-2.5 h-2.5" />
                            {event.deviceName}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter leading-none mb-0.5">Confidence</span>
                                <span className={cn(
                                    "text-[10px] font-black leading-none",
                                    event.confidence > 0.8 ? "text-emerald-500" : "text-amber-500"
                                )}>{(event.confidence * 100).toFixed(1)}%</span>
                            </div>
                            {event.similarity && (
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter leading-none mb-0.5">Similarity</span>
                                    <span className="text-[10px] font-black text-blue-500 leading-none">{(event.similarity * 100).toFixed(1)}%</span>
                                </div>
                            )}
                        </div>
                        <Badge className={cn(
                            "text-[8px] h-3.5 uppercase font-black border-none",
                            event.processingStatus === 'completed' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600"
                        )}>
                            {event.processingStatus}
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
};
