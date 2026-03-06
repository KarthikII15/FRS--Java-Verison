import React, { useState } from 'react';
import { cn } from '../../ui/utils';
import { Device } from '../../../data/enhancedMockData';
import { Video, Cpu, Activity, ShieldAlert, WifiOff } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { lightTheme } from '../../../../theme/lightTheme';

interface DevicePlacementLayerProps {
    initialDevices: Device[];
    isReadOnly?: boolean;
    onSave?: (devices: Device[]) => void;
}

export const DevicePlacementLayer: React.FC<DevicePlacementLayerProps> = ({ initialDevices, isReadOnly = false, onSave }) => {
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    const [activePlacement, setActivePlacement] = useState<'Camera' | 'Edge Device' | null>(null);

    const renderCoverageCone = (device: Device) => {
        if (device.type !== 'Camera' || !device.coordinates || !device.coverageConeAngle) return null;

        const { x, y } = device.coordinates;
        const radius = (device.coverageRadius || 20) / 2;
        const angle = device.coverageConeAngle;
        const rotation = (device.rotationAngle || 0) + 90;

        const startAngle = rotation - angle / 2;
        const endAngle = rotation + angle / 2;

        const x1 = x + radius * Math.cos((startAngle * Math.PI) / 180);
        const y1 = y + radius * Math.sin((startAngle * Math.PI) / 180);
        const x2 = x + radius * Math.cos((endAngle * Math.PI) / 180);
        const y2 = y + radius * Math.sin((endAngle * Math.PI) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        const d = `M ${x} ${y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

        return (
            <path
                key={`cone-${device.id}`}
                d={d}
                fill="rgba(79, 70, 229, 0.15)"
                stroke="rgba(79, 70, 229, 0.3)"
                strokeWidth="0.2"
                className="transition-opacity duration-300 pointer-events-none"
            />
        );
    };

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isReadOnly || !activePlacement) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newDevice: Device = {
            id: `dev-new-${Date.now()}`,
            name: `New ${activePlacement}`,
            type: activePlacement,
            location: 'Unassigned',
            status: 'Offline',
            lastActive: 'Never',
            assignedPoint: 'Unassigned',
            coordinates: { x, y },
            rotationAngle: activePlacement === 'Camera' ? 90 : undefined,
            coverageConeAngle: activePlacement === 'Camera' ? 90 : undefined,
            coverageRadius: activePlacement === 'Camera' ? 20 : undefined,
            recognitionAccuracy: 0
        };

        const updatedDevices = [...devices, newDevice];
        setDevices(updatedDevices);
        setActivePlacement(null);
        if (onSave) onSave(updatedDevices);
    };

    return (
        <div
            className={cn(
                "absolute inset-0 z-20",
                !isReadOnly ? "pointer-events-auto" : "pointer-events-none",
                activePlacement ? "cursor-crosshair" : ""
            )}
            onClick={handleMapClick}
        >
            {/* Coverage Cones Floor Layer */}
            <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {devices.map(renderCoverageCone)}
            </svg>

            {/* Device Markers */}
            {devices.map((device) => {
                if (!device.coordinates) return null;

                const style = {
                    left: `${device.coordinates.x}%`,
                    top: `${device.coordinates.y}%`,
                    transform: 'translate(-50%, -50%)'
                };

                const isCamera = device.type === 'Camera';
                const isOffline = device.status === 'Offline';
                const hasWarning = !!device.warningState;

                return (
                    <div
                        key={device.id}
                        className={cn(
                            "absolute pointer-events-auto flex flex-col items-center group",
                            !isReadOnly && !activePlacement && "cursor-grab active:cursor-grabbing hover:z-30"
                        )}
                        style={style}
                        onClick={(e) => { e.stopPropagation(); }}
                    >
                        {/* Status Halo / Pulse Ring */}
                        <div className="relative">
                            {!isReadOnly && (
                                <div className={cn(
                                    "absolute inset-0 rounded-full animate-ping opacity-20",
                                    isOffline ? "bg-red-500 scale-150" : hasWarning ? "bg-amber-500 scale-125" : "bg-emerald-500"
                                )} />
                            )}

                            <div className={cn(
                                "relative w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border-2",
                                isCamera
                                    ? "bg-indigo-600/90 text-white border-indigo-400/50"
                                    : "bg-emerald-600/90 text-white border-emerald-400/50",
                                !isReadOnly && "group-hover:scale-110 group-hover:shadow-indigo-500/40",
                                isOffline && "grayscale opacity-80 border-slate-500",
                                hasWarning && "border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                            )}>
                                {isCamera ? (
                                    isOffline ? <WifiOff className="w-4 h-4" /> : <Video className="w-4 h-4" />
                                ) : (
                                    <Cpu className="w-4 h-4" />
                                )}

                                <span className={cn(
                                    "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2",
                                    lightTheme.border.card,
                                    "dark:border-[#0B101A]",
                                    isOffline ? "bg-rose-500" : hasWarning ? "bg-amber-500 animate-pulse" : "bg-emerald-400"
                                )} />
                            </div>
                        </div>

                        {/* Hover Tooltip - Enterprise Card View */}
                        <div className="absolute top-12 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none translate-y-2 group-hover:translate-y-0">
                            <div className={cn("backdrop-blur-md border p-3 rounded-xl shadow-2xl text-left min-w-[200px]", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900/95 dark:border-slate-700/50")}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className={cn("text-sm font-bold truncate pr-4", lightTheme.text.primary, "dark:text-white")}>{device.name}</p>
                                    <Activity className={cn("w-3 h-3", isOffline ? "text-slate-500" : "text-emerald-400 animate-pulse")} />
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] mb-3">
                                    <div className="space-y-1">
                                        <p className={cn(lightTheme.text.label, "dark:text-slate-400")}>Status</p>
                                        <p className={cn("font-medium", isOffline ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400")}>{device.status}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className={cn(lightTheme.text.label, "dark:text-slate-400")}>Daily Events</p>
                                        <p className="text-blue-400 font-medium">{device.dailyEvents || 0}</p>
                                    </div>
                                </div>

                                <div className={cn("flex items-center justify-between pt-2 border-t pointer-events-auto", lightTheme.border.default, "dark:border-border")}>
                                    <span className={cn("text-[9px]", lightTheme.text.label, "dark:text-slate-500")}>Role: {device.deviceRole || 'Monitor'}</span>
                                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline">
                                        Configure →
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {!isReadOnly && (
                <div className={cn("absolute bottom-4 right-4 backdrop-blur-md p-4 rounded-xl border shadow-2xl pointer-events-auto", lightTheme.background.secondary, "border-emerald-500/30 dark:bg-slate-900/95")}>
                    <div className={cn("flex items-center justify-between mb-3 border-b pb-2", lightTheme.border.default, "dark:border-slate-700/50")}>
                        <p className={cn("text-xs font-bold", lightTheme.text.primary, "dark:text-white")}>Hardware Library</p>
                        {activePlacement && (
                            <Badge variant="outline" className="text-[9px] border-emerald-500 text-emerald-400 bg-emerald-500/10 pointer-events-auto cursor-pointer" onClick={() => setActivePlacement(null)}>
                                Cancel Placement
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <div
                            onClick={() => setActivePlacement(activePlacement === 'Camera' ? null : 'Camera')}
                            className={cn(
                                "cursor-pointer w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all",
                                activePlacement === 'Camera'
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-500 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                    : cn(lightTheme.background.primary, lightTheme.border.default, lightTheme.text.muted, "hover:border-indigo-500/50 hover:text-indigo-500 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400")
                            )}
                        >
                            <Video className="w-5 h-5 mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Camera</span>
                        </div>
                        <div
                            onClick={() => setActivePlacement(activePlacement === 'Edge Device' ? null : 'Edge Device')}
                            className={cn(
                                "cursor-pointer w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all",
                                activePlacement === 'Edge Device'
                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-500 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                    : cn(lightTheme.background.primary, lightTheme.border.default, lightTheme.text.muted, "hover:border-emerald-500/50 hover:text-emerald-500 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-emerald-500/50 dark:hover:text-emerald-400")
                            )}
                        >
                            <Cpu className="w-5 h-5 mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Edge LPU</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

