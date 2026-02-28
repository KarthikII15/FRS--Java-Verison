import React, { useState, useEffect, useMemo } from 'react';
import { Area, Device, mockAreas, mockDevices, mockFloors, mockEmployees, FacilityEvent, LiveOfficePresence } from '../../../data/enhancedMockData';
import { FloorMapCanvas } from './FloorMapCanvas';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { ArrowLeft, Users, AlertTriangle, Activity, Filter, ShieldCheck, ArrowUpRight, ArrowDownRight, Clock, MapPin, History } from 'lucide-react';
import { cn } from '../../ui/utils';
import { TimelinePlayback } from './TimelinePlayback';
import { lightTheme } from '../../../../theme/lightTheme';

interface LiveFloorViewProps {
    floorId: string;
    onBack: () => void;
}

import { useRealTimeEngine } from '../../../hooks/useRealTimeEngine';

const getStatusForPresence = (presence: LiveOfficePresence) => {
    let status = 'normal' as 'normal' | 'warning' | 'unauthorized' | 'long-stay' | 'missing-checkout' | 'alert';
    const hoursMatch = presence.duration.match(/(\d+)h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    if (presence.status === 'Checked-In Only' && hours >= 12) status = 'missing-checkout';
    else if (hours >= 10) status = 'long-stay';
    else if (hours > 8) status = 'warning';
    return status;
}

const syncLiveTracking = (floorId: string, presenceList: LiveOfficePresence[], existing: LiveTrackingPerson[]) => {
    return presenceList.map((presence, idx) => {
        const ext = existing.find(e => e.employeeId === presence.employeeId);
        if (ext) {
            return {
                ...ext,
                status: getStatusForPresence(presence),
                duration: presence.duration,
                lastSeen: presence.lastSeenTime
            };
        }

        const floorAreas = mockAreas.filter(a => a.floorId === floorId);
        const assignedArea = floorAreas[idx % Math.max(1, floorAreas.length)] || mockAreas[0];

        let x = 50, y = 50;
        if (assignedArea && assignedArea.polygonCoordinates.length > 0) {
            const minX = Math.min(...assignedArea.polygonCoordinates.map(p => p.x));
            const maxX = Math.max(...assignedArea.polygonCoordinates.map(p => p.x));
            const minY = Math.min(...assignedArea.polygonCoordinates.map(p => p.y));
            const maxY = Math.max(...assignedArea.polygonCoordinates.map(p => p.y));
            x = minX + Math.random() * (maxX - minX);
            y = minY + Math.random() * (maxY - minY);
        }

        const emp = mockEmployees.find(e => e.id === presence.employeeId);
        return {
            employeeId: presence.employeeId,
            name: presence.employeeName,
            department: presence.department,
            coordinates: { x, y },
            status: getStatusForPresence(presence),
            duration: presence.duration,
            lastSeen: presence.lastSeenTime,
            avatarUrl: emp?.profileImage,
            areaId: assignedArea?.id || 'unknown'
        };
    });
};

interface LiveTrackingPerson {
    employeeId: string;
    name: string;
    department: string;
    coordinates: { x: number; y: number };
    status: 'normal' | 'warning' | 'unauthorized' | 'long-stay' | 'missing-checkout' | 'alert';
    duration: string;
    lastSeen: string;
    avatarUrl?: string;
    areaId: string;
}

export const LiveFloorView: React.FC<LiveFloorViewProps> = ({ floorId, onBack }) => {
    const floor = mockFloors.find(f => f.id === floorId);
    const areas = mockAreas.filter((a: Area) => a.floorId === floorId);
    const devices = mockDevices.filter((d: Device) => d.floorId === floorId);

    const { events: realtimeEvents, presence: realtimePresence } = useRealTimeEngine();

    const [liveTracking, setLiveTracking] = useState<LiveTrackingPerson[]>([]);
    const [viewMode, setViewMode] = useState<'realtime' | 'insights' | 'security'>('realtime');
    const [highlightedAreaId, setHighlightedAreaId] = useState<string | null>(null);
    const [ripples, setRipples] = useState<{ id: string; x: number; y: number; type: string }[]>([]);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showDevices, setShowDevices] = useState(true);
    const [showReplay, setShowReplay] = useState(false);

    const liveEvents = useMemo(() => realtimeEvents.filter(e => e.floorId === floorId), [realtimeEvents, floorId]);

    useEffect(() => {
        setLiveTracking(prev => syncLiveTracking(floorId, realtimePresence, prev));
    }, [realtimePresence, floorId]);

    useEffect(() => {
        if (liveEvents.length > 0) {
            const latest = liveEvents[0];
            const newRipple = {
                id: latest.id,
                x: latest.coordinates?.x || 50,
                y: latest.coordinates?.y || 50,
                type: latest.type === 'alert' ? 'alert' : 'entry'
            };
            setRipples(prev => {
                if (prev.find(r => r.id === newRipple.id)) return prev;
                return [...prev.slice(-4), newRipple];
            });
            const t = setTimeout(() => {
                setRipples(prev => prev.filter(r => r.id !== newRipple.id));
            }, 2000);
            return () => clearTimeout(t);
        }
    }, [liveEvents]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Jitter tracking
            setLiveTracking(prev => prev.map(p => ({
                ...p,
                coordinates: {
                    x: Math.max(0, Math.min(100, p.coordinates.x + (Math.random() * 1.5 - 0.75))),
                    y: Math.max(0, Math.min(100, p.coordinates.y + (Math.random() * 1.5 - 0.75))),
                }
            })));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    if (!floor) return null;

    const totalOccupancy = liveTracking.length;
    const floorCapacity = floor.capacity || 100;
    const occupancyRate = Math.round((totalOccupancy / floorCapacity) * 100);
    const warningCount = liveTracking.filter((t: any) => t.status !== 'normal').length;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'warning': return 'bg-yellow-500';
            case 'long-stay': return 'bg-orange-500';
            case 'missing-checkout': return 'bg-red-500';
            case 'unauthorized': return 'bg-rose-500';
            case 'alert': return 'bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.8)]';
            default: return 'bg-emerald-500';
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Command Center Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            Command Center: {floor.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Real-time facility intelligence and spatial occupancy tracking
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Floor Occupancy Panel */}
                    <div className={cn("backdrop-blur-md border rounded-xl px-4 py-2 flex items-center gap-6 shadow-xl", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/80 dark:border-slate-700/50")}>
                        <div className="flex flex-col">
                            <span className={cn("text-[10px] uppercase font-bold tracking-tighter", lightTheme.text.label, "dark:text-slate-500")}>Current Inside</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className={cn("text-xl font-black", lightTheme.text.primary, "dark:text-white")}>{totalOccupancy}</span>
                                <span className={cn("text-[10px]", lightTheme.text.label, "dark:text-slate-500")}>of {floorCapacity}</span>
                            </div>
                        </div>
                        <div className={cn("w-px h-8", lightTheme.background.secondary, "dark:bg-slate-800")} />
                        <div className="flex flex-col">
                            <span className={cn("text-[10px] uppercase font-bold tracking-tighter", lightTheme.text.label, "dark:text-slate-500")}>Usage Rate</span>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-lg font-bold",
                                    occupancyRate > 90 ? "text-rose-600 dark:text-rose-400" : occupancyRate > 70 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                                )}>{occupancyRate}%</span>
                                <Activity className={cn("w-3 h-3", lightTheme.text.muted, "dark:text-slate-600")} />
                            </div>
                        </div>
                        <div className={cn("w-px h-8", lightTheme.background.secondary, "dark:bg-slate-800")} />
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center">
                                <ArrowUpRight className="w-4 h-4 text-emerald-500 mb-0.5" />
                                <span className="text-[10px] text-emerald-500 font-bold">12</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <ArrowDownRight className="w-4 h-4 text-blue-500 mb-0.5" />
                                <span className="text-[10px] text-blue-500 font-bold">8</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-[650px]">
                {/* Visual Intelligence Map View */}
                <div className={cn("lg:col-span-3 border rounded-2xl relative overflow-hidden shadow-2xl", lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                    <FloorMapCanvas
                        layoutImageUrl={floor.layoutImageUrl || '/floorplans/sample-floorplan.svg'}
                        areas={areas}
                        devices={devices}
                        isViewOnly
                        highlightedAreaId={highlightedAreaId}
                        onAreaClick={(id) => setHighlightedAreaId(id)}
                    />

                    {/* Phase 8.3: Live Ripples Layer */}
                    <div className="absolute inset-0 z-25 pointer-events-none">
                        {ripples.map(ripple => (
                            <div
                                key={ripple.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-full animate-ping opacity-75 border-2",
                                    ripple.type === 'alert' ? "border-red-500 bg-red-500/20" : "border-emerald-500 bg-emerald-500/20"
                                )} />
                                <div className={cn(
                                    "absolute inset-0 w-4 h-4 rounded-full animate-ping opacity-40 border-2 delay-300",
                                    ripple.type === 'alert' ? "border-red-500" : "border-emerald-500"
                                )} />
                            </div>
                        ))}
                    </div>

                    {/* Phase 8.4: Heatmap Layer */}
                    {showHeatmap && (
                        <div className="absolute inset-0 z-15 pointer-events-none opacity-60">
                            {areas.map(area => {
                                const count = liveTracking.filter((p: any) => p.areaId === area.id).length;
                                const intensity = Math.min(100, (count / (area.capacity || 10)) * 100);
                                if (intensity === 0) return null;
                                return (
                                    <div
                                        key={`heat-${area.id}`}
                                        className="absolute transition-all duration-1000"
                                        style={{
                                            left: `${area.polygonCoordinates[0].x}%`,
                                            top: `${area.polygonCoordinates[0].y}%`,
                                            width: '150px',
                                            height: '150px',
                                            transform: 'translate(-50%, -50%)',
                                            background: `radial-gradient(circle, ${intensity > 70 ? 'rgba(239, 68, 68, 0.4)' : intensity > 40 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.2)'} 0%, transparent 70%)`,
                                            borderRadius: '50%'
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Area Intelligence Overlay Badges */}
                    <div className="absolute inset-0 z-30 pointer-events-none">
                        {areas.map(area => {
                            // Find area center for badge placement
                            const minX = Math.min(...area.polygonCoordinates.map(p => p.x));
                            const minY = Math.min(...area.polygonCoordinates.map(p => p.y));
                            const maxX = Math.max(...area.polygonCoordinates.map(p => p.x));
                            const maxY = Math.max(...area.polygonCoordinates.map(p => p.y));
                            const centerX = (minX + maxX) / 2;
                            const centerY = (minY + maxY) / 2;

                            const areaOccupancy = liveTracking.filter((p: any) => p.areaId === area.id).length;
                            const capacity = area.capacity || 20;
                            const usage = Math.round((areaOccupancy / capacity) * 100);

                            return (
                                <div
                                    key={`badge-${area.id}`}
                                    className={cn("absolute border rounded-lg px-2 py-1 shadow-lg backdrop-blur-sm flex flex-col items-center min-w-[50px] transition-transform hover:scale-110 pointer-events-auto cursor-pointer", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/90 dark:border-slate-700/50")}
                                    style={{ left: `${centerX}%`, top: `${centerY}%`, transform: 'translate(-50%, -50%)' }}
                                >
                                    <span className={cn("text-[8px] font-bold uppercase truncate max-w-[60px]", lightTheme.text.label, "dark:text-slate-400")}>{area.name}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Users className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                        <span className={cn("text-xs font-bold", lightTheme.text.primary, "dark:text-white")}>{areaOccupancy}</span>
                                    </div>
                                    <div className={cn("w-full h-1 rounded-full mt-1 overflow-hidden", lightTheme.background.primary, "dark:bg-slate-800")}>
                                        <div className={cn("h-full", usage > 90 ? "bg-rose-500" : usage > 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${usage}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Live Employee Movement Markers */}
                    <div className="absolute inset-0 z-40 pointer-events-none">
                        {liveTracking.map((person: any, idx: number) => (
                            <div
                                key={idx}
                                className="absolute transition-all duration-4000 ease-linear pointer-events-auto group"
                                style={{ left: `${person.coordinates.x}%`, top: `${person.coordinates.y}%`, transform: 'translate(-50%, -50%)' }}
                            >
                                <div className="relative">
                                    <div className={cn(
                                        "w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-xl transition-colors duration-500",
                                        getStatusColor(person.status)
                                    )} />
                                    <div className={cn(
                                        "absolute inset-0 rounded-full animate-ping opacity-40 scale-150",
                                        getStatusColor(person.status)
                                    )} />
                                </div>

                                {/* Rich Hover Card */}
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none">
                                    <Card className="bg-slate-900/95 border-slate-700 shadow-2xl p-3 flex items-center gap-3 min-w-[200px] translate-y-2 group-hover:translate-y-0">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden">
                                                {person.avatarUrl ? (
                                                    <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                        <Users className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={cn("absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900", getStatusColor(person.status))} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-white text-sm font-bold">{person.name}</p>
                                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-700 text-slate-500">ID: {person.employeeId.slice(0, 6)}</Badge>
                                            </div>
                                            <p className="text-slate-400 text-xs">{person.department}</p>
                                            <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-800">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-blue-400" />
                                                    <span className="text-[10px] text-slate-300">{person.duration}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-[10px] text-slate-300">Zone Alpha</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Floating Map Controls */}
                    <div className="absolute top-4 right-4 z-50 flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" className="bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800 shadow-xl border">
                                    <Filter className="w-4 h-4 mr-2" />
                                    Layer Filters
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-64 bg-slate-900 border-slate-700 text-slate-300 shadow-2xl">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">Active Overlays</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="live-presence" className="text-xs font-medium cursor-pointer">Live Indicators</Label>
                                            <Switch id="live-presence" defaultChecked />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="area-badges" className="text-xs font-medium cursor-pointer">Occupancy Badges</Label>
                                            <Switch id="area-badges" defaultChecked />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="device-layer" className="text-xs font-medium cursor-pointer">Hardware Markers</Label>
                                            <Switch id="device-layer" checked={showDevices} onCheckedChange={setShowDevices} />
                                        </div>
                                        <div className="pt-2">
                                            <Label className="text-xs text-slate-500 mb-2 block">Visual Mode</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button size="sm" variant={!showHeatmap ? "default" : "outline"} className="text-[10px] h-7" onClick={() => setShowHeatmap(false)}>Standard</Button>
                                                <Button size="sm" variant={showHeatmap ? "default" : "outline"} className="text-[10px] h-7" onClick={() => setShowHeatmap(true)}>Heatmap</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button
                            size="sm"
                            variant={showReplay ? "default" : "outline"}
                            className={cn(
                                "shadow-lg transition-colors border",
                                showReplay ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500" : "bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800"
                            )}
                            onClick={() => setShowReplay(!showReplay)}
                        >
                            <History className="w-4 h-4 mr-2" />
                            Replay History
                        </Button>
                        <Button size="sm" className="bg-blue-600/90 hover:bg-blue-500 text-white shadow-lg border-0">
                            <Activity className="w-4 h-4 mr-2" />
                            Live Telemetry
                        </Button>
                    </div>

                    {/* Timeline Playback Overlay */}
                    {showReplay && (
                        <div className="absolute inset-x-0 bottom-0 z-50 flex justify-center pb-8 pointer-events-none">
                            <div className="pointer-events-auto w-full max-w-2xl">
                                <TimelinePlayback
                                    onTimeChange={(time) => console.log('Replay Time Changed:', time)}
                                    onClose={() => setShowReplay(false)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Intelligence Panel */}
                <div className="lg:col-span-1 flex flex-col h-full gap-4">
                    <Card className={cn("flex-grow overflow-hidden flex flex-col border", lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                        <CardHeader className={cn("p-4 border-b", lightTheme.border.default, "dark:border-border")}>
                            <div className={cn("flex p-1 rounded-lg", lightTheme.background.secondary, "dark:bg-slate-950")}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("flex-1 text-xs py-1", viewMode === 'realtime' ? cn(lightTheme.background.primary, "text-white shadow-sm dark:bg-slate-800") : cn(lightTheme.text.label, "dark:text-slate-400"))}
                                    onClick={() => setViewMode('realtime')}
                                >
                                    Distribution
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("flex-1 text-xs py-1", viewMode === 'insights' ? cn(lightTheme.background.primary, "text-white shadow-sm dark:bg-slate-800") : cn(lightTheme.text.label, "dark:text-slate-400"))}
                                    onClick={() => setViewMode('insights')}
                                >
                                    Insights
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("flex-1 text-xs py-1", viewMode === 'security' ? cn(lightTheme.background.primary, "text-white shadow-sm dark:bg-slate-800") : cn(lightTheme.text.label, "dark:text-slate-400"))}
                                    onClick={() => setViewMode('security')}
                                >
                                    Security
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 overflow-y-auto max-h-[600px]">
                            {viewMode === 'realtime' ? (
                                <div className="space-y-4">
                                    <h4 className={cn("text-xs font-semibold uppercase tracking-wider", lightTheme.text.label, "dark:text-slate-500")}>Area Distribution</h4>
                                    {mockAreas.filter(a => a.floorId === floorId).map(area => {
                                        const count = liveTracking.filter((p: any) => p.areaId === area.id).length; // Use liveTracking for count
                                        const percentage = Math.round((count / (area.capacity || 10)) * 100);
                                        return (
                                            <div
                                                key={area.id}
                                                className={cn(
                                                    "p-3 rounded-lg border transition-all cursor-pointer",
                                                    highlightedAreaId === area.id
                                                        ? cn(lightTheme.background.primary, "bg-opacity-10 border-blue-500 shadow-sm dark:bg-blue-600/10 dark:border-blue-500/50 dark:shadow-[0_0_15px_rgba(59,130,246,0.1)]")
                                                        : cn(lightTheme.background.secondary, lightTheme.border.default, "hover:border-blue-300 dark:bg-slate-950/50 dark:border-border dark:hover:border-slate-700")
                                                )}
                                                onMouseEnter={() => setHighlightedAreaId(area.id)}
                                                onMouseLeave={() => setHighlightedAreaId(null)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className={cn("text-sm font-medium", lightTheme.text.primary, "dark:text-white")}>{area.name}</div>
                                                        <div className={cn("text-[10px]", lightTheme.text.label, "dark:text-slate-500")}>{area.type}</div>
                                                    </div>
                                                    <Badge variant="outline" className={cn("text-[10px]", lightTheme.background.primary, "text-white border-transparent dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300")}>
                                                        {count} / {area.capacity}
                                                    </Badge>
                                                </div>
                                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-500",
                                                            percentage > 80 ? "bg-red-500" : percentage > 50 ? "bg-amber-500" : "bg-emerald-500"
                                                        )}
                                                        style={{ width: `${Math.min(100, percentage)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : viewMode === 'insights' ? (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Dwell Time Distribution</h4>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Short Stay (< 1hr)', value: 12, color: 'bg-emerald-500' },
                                                { label: 'Work Session (1-4hr)', value: 45, color: 'bg-blue-500' },
                                                { label: 'Long Stay (4-8hr)', value: 28, color: 'bg-amber-500' },
                                                { label: 'Extended (8hr+)', value: 15, color: 'bg-rose-500' },
                                            ].map((stat, i) => (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-slate-400">{stat.label}</span>
                                                        <span className="text-white font-bold">{stat.value}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={cn("h-full rounded-full", stat.color)} style={{ width: `${stat.value}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs font-bold text-blue-400">AI Intelligence</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-relaxed">
                                            Zone "Marketing Hub" is reaching 85% capacity. Suggest opening auxiliary lounge Floor 1.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Events</h4>
                                    <div className="space-y-3">
                                        {liveEvents.map((event: FacilityEvent) => {
                                            const emp = mockEmployees.find(e => e.id === event.employeeId);
                                            const area = mockAreas.find(a => a.id === event.areaId);
                                            return (
                                                <div key={event.id} className={cn(
                                                    "flex gap-3 items-start animate-in slide-in-from-right-4 duration-300 p-2 rounded-lg transition-colors",
                                                    event.type === 'alert' ? "bg-red-500/10 border border-red-500/20" : "hover:bg-slate-900/40"
                                                )}>
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                                        event.type === 'entry' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                                            event.type === 'alert' ? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" :
                                                                event.type === 'exit' ? "bg-blue-500" : "bg-indigo-500"
                                                    )} />
                                                    <div className="flex-grow min-w-0">
                                                        <div className="text-xs text-white">
                                                            <span className="font-semibold">{emp?.name || 'Unknown'}</span>
                                                            <span className={cn(
                                                                "mx-1",
                                                                event.type === 'alert' ? "text-red-400 font-bold" : "text-slate-400"
                                                            )}>
                                                                {event.type === 'entry' ? 'arrived at' :
                                                                    event.type === 'alert' ? 'TRIGGERED ALERT in' :
                                                                        event.type === 'exit' ? 'left' : 'entered'}
                                                            </span>
                                                            <span className={cn(
                                                                "font-medium",
                                                                event.type === 'alert' ? "text-red-400 underline decoration-red-500/50" : "text-blue-400"
                                                            )}>{area?.name || 'unknown zone'}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                                                            <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                            {event.type === 'alert' && (
                                                                <span className="text-red-600 font-black text-[8px] uppercase tracking-widest animate-pulse">Critical</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};


