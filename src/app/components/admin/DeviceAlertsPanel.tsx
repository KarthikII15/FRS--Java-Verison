import React, { useState } from 'react';
import {
    AlertTriangle,
    AlertCircle,
    Info,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Bell,
    MoreVertical,
    X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { DeviceAlert } from '../../data/enhancedMockData';
import { lightTheme } from '../../../theme/lightTheme';

interface DeviceAlertsPanelProps {
    alerts: DeviceAlert[];
}

export const DeviceAlertsPanel: React.FC<DeviceAlertsPanelProps> = ({ alerts }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const unresolvedCritical = alerts.filter(a => !a.resolved && a.severity === 'Critical');

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 md:left-64 border-t z-[50] transition-all duration-500",
            lightTheme.background.card, lightTheme.border.default, "shadow-[0_-10px_40px_rgba(0,0,0,0.08)]",
            "dark:bg-slate-950 dark:border-border dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
            isExpanded ? "md:h-[400px]" : "h-14"
        )}>
            {/* Mini Bar Control */}
            <div
                className={cn("h-14 px-6 flex items-center justify-between cursor-pointer group", "hover:bg-slate-50", "dark:hover:bg-slate-900/50")}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Bell className={cn(
                            "w-4 h-4",
                            unresolvedCritical.length > 0 ? "text-rose-500 animate-pulse" : cn(lightTheme.text.muted, "dark:text-slate-500")
                        )} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.secondary, "dark:text-slate-400")}>Op-Center Alerts</span>
                    </div>

                    <div className={cn("h-4 w-px", lightTheme.background.secondary, "dark:bg-slate-800")} />

                    <div className="flex items-center gap-3">
                        <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px] px-1.5 h-4">
                            {unresolvedCritical.length} CRITICAL
                        </Badge>
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] px-1.5 h-4">
                            {alerts.length - unresolvedCritical.length} WARNINGS
                        </Badge>
                    </div>

                    {unresolvedCritical.length > 0 && !isExpanded && (
                        <div className={cn("hidden lg:flex items-center gap-2 text-[10px] italic", lightTheme.text.secondary, "dark:text-slate-500")}>
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            Latest: {unresolvedCritical[0].deviceName} - {unresolvedCritical[0].message}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold text-blue-500 dark:text-blue-400">
                        Clear All
                    </Button>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                        lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.muted, "group-hover:text-foreground",
                        "dark:bg-slate-900 dark:border-border dark:text-slate-500 dark:group-hover:text-white"
                    )}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {/* Expanded Alert List */}
            {isExpanded && (
                <div className={cn("h-[calc(400px-56px)] overflow-y-auto p-6 space-y-4 custom-scrollbar", lightTheme.background.primary, "dark:bg-slate-950")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all hover:scale-[1.01] group relative",
                                    alert.severity === 'Critical' ? "bg-rose-50 border-rose-200 dark:bg-rose-500/5 dark:border-rose-500/10" :
                                        alert.severity === 'Warning' ? "bg-amber-50 border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/10" : "bg-blue-50 border-blue-200 dark:bg-blue-500/5 dark:border-blue-500/10"
                                )}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center border",
                                        alert.severity === 'Critical' ? "bg-rose-100 border-rose-300 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-500" :
                                            alert.severity === 'Warning' ? "bg-amber-100 border-amber-300 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-500" : "bg-blue-100 border-blue-300 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-500"
                                    )}>
                                        {alert.severity === 'Critical' ? <AlertCircle className="w-4 h-4" /> :
                                            alert.severity === 'Warning' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                                    </div>
                                    <div className={cn("text-[9px] font-bold uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>
                                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className={cn("text-xs font-bold transition-colors uppercase tracking-tight group-hover:text-blue-600", lightTheme.text.primary, "dark:text-white dark:group-hover:text-blue-400")}>
                                        {alert.type}
                                    </div>
                                    <div className={cn("text-[11px] font-medium", lightTheme.text.secondary, "dark:text-slate-400")}>
                                        {alert.deviceName} · {alert.floorName}
                                    </div>
                                    <div className={cn("text-[10px] italic mt-2", lightTheme.text.label, "dark:text-slate-500")}>
                                        "{alert.message}"
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <Button variant="ghost" size="sm" className={cn("h-7 px-3 text-[10px] font-bold border rounded-lg transition-all",
                                        lightTheme.text.secondary, lightTheme.border.default, "hover:bg-slate-100 hover:text-foreground",
                                        "dark:text-slate-400 dark:border-border dark:hover:bg-slate-800 dark:hover:text-white"
                                    )}>
                                        View Device
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-3 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/5"
                                    >
                                        <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                        Resolve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

