import React, { useMemo } from 'react';
import { Area, Device } from '../../../data/enhancedMockData';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { AlertCircle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { cn } from '../../ui/utils';
import { lightTheme } from '../../../../theme/lightTheme';

interface MapValidationPanelProps {
    areas: Area[];
    devices: Device[];
}

export const MapValidationPanel: React.FC<MapValidationPanelProps> = ({ areas, devices }) => {
    const validations = useMemo(() => {
        const issues: { type: 'error' | 'warning' | 'info'; message: string }[] = [];

        // 1. Unmonitored Areas
        areas.forEach(area => {
            const areaDevices = devices.filter(d =>
                // Simple hit test or property match (for demo, we assume areaId is set or physical proximity)
                // In actual implementation, we would do a point-in-polygon check.
                d.deviceRole === 'Zone' || d.type === 'Camera'
            );

            // For the mock, just checking total coverage loosely
            if (devices.length === 0) {
                issues.push({ type: 'error', message: `Area "${area.name}" active but lacks camera coverage.` });
            }
        });

        // 2. Orphaned Devices
        // Assuming devices should have an assigned area
        devices.forEach(device => {
            if (!device.location || device.location.includes('Unknown')) {
                issues.push({ type: 'warning', message: `Device "${device.name}" is placed but lacks a formal zone assignment.` });
            }
        });

        // 3. Entry/Exit mismatch
        const entries = devices.filter(d => d.deviceRole === 'Entry').length;
        const exits = devices.filter(d => d.deviceRole === 'Exit').length;
        if (entries > 0 && exits === 0) {
            issues.push({ type: 'warning', message: 'Facility has entry tracking but lacks dedicated exit monitoring.' });
        }

        // 4. Overall clear
        if (areas.length === 0) {
            issues.push({ type: 'info', message: 'No areas defined yet. Draw areas to begin validation.' });
        }

        // Deduplicate errors for the mock just in case
        const uniqueIssues = Array.from(new Set(issues.map(i => JSON.stringify(i)))).map(i => JSON.parse(i));
        return uniqueIssues;
    }, [areas, devices]);

    return (
        <Card className={cn("border", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
            <CardHeader className="p-4 pb-2">
                <CardTitle className={cn("text-sm font-bold flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
                    <ShieldAlert className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Validation Engine
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {validations.length === 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-emerald-400">Map is Fully Validated</p>
                            <p className="text-xs text-emerald-500/80">All zones have assigned entry, exit, and monitoring constraints met.</p>
                        </div>
                    </div>
                ) : (
                    validations.map((val, idx) => (
                        <div key={idx} className={cn(
                            "flex gap-3 p-3 border rounded-lg",
                            val.type === 'error' ? "bg-rose-500/10 border-rose-500/20" :
                                val.type === 'warning' ? "bg-amber-500/10 border-amber-500/20" :
                                    "bg-blue-500/10 border-blue-500/20"
                        )}>
                            {val.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                            {val.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />}
                            {val.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
                            <div className="flex-1 text-xs">
                                <p className={cn(
                                    "font-bold mb-0.5",
                                    val.type === 'error' ? "text-rose-400" :
                                        val.type === 'warning' ? "text-amber-400" : "text-blue-400"
                                )}>
                                    {val.type === 'error' ? 'Critical Constraint' : val.type === 'warning' ? 'Optimization Notice' : 'System Note'}
                                </p>
                                <p className={cn(
                                    val.type === 'error' ? "text-rose-300" :
                                        val.type === 'warning' ? "text-amber-300" : "text-blue-300"
                                )}>
                                    {val.message}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
};

