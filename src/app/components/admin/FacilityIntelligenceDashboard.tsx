import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    Building2,
    Users,
    Map as MapIcon,
    Camera,
    Cpu,
    ArrowUpRight,
    Activity,
    Clock,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Target,
    MoreVertical
} from 'lucide-react';
import { cn } from '../ui/utils';
import { mockBuildings, mockFloors, mockAreas, mockDevices, mockLivePresence, Floor, Area } from '../../data/enhancedMockData';
import { lightTheme } from '../../../theme/lightTheme';

export const FacilityIntelligenceDashboard: React.FC = () => {
    const [expandedFloorId, setExpandedFloorId] = useState<string | null>(null);

    // Facility Stats
    const facilityStats = {
        buildings: mockBuildings.length,
        activeFloors: mockFloors.length,
        areas: mockAreas.length,
        cameras: mockDevices.filter(d => d.type === 'Camera' && d.status === 'Online').length,
        edgeDevices: mockDevices.filter(d => d.type === 'Edge Device' && d.status === 'Online').length,
        employeesInside: mockLivePresence.length,
    };

    const toggleFloor = (id: string) => {
        setExpandedFloorId(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-8 pb-12">
            {/* ðŸ”· Facility Summary HUD */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <GlobalStatCard title="Total Buildings" value={facilityStats.buildings} icon={Building2} color="text-blue-500" />
                <GlobalStatCard title="Active Floors" value={facilityStats.activeFloors} icon={Activity} color="text-emerald-500" />
                <GlobalStatCard title="Managed Areas" value={facilityStats.areas} icon={MapIcon} color="text-indigo-500" />
                <GlobalStatCard title="Online Hardware" value={`${facilityStats.cameras + facilityStats.edgeDevices}`} icon={Cpu} color="text-amber-500" />
                <GlobalStatCard title="Employees Inside" value={facilityStats.employeesInside} icon={Users} color="text-purple-500" />
            </div>

            {/* ðŸ”· Validation Advisory */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div className="text-sm">
                        <span className="font-bold text-amber-500">Ops Advisory:</span>
                        <span className="text-amber-300 ml-2">3 floors detect minor configuration gaps (unassigned cameras or exit roles missing).</span>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-amber-400 hover:text-amber-300 uppercase font-black tracking-widest">
                    Audit Configuration
                </Button>
            </div>

            {/* ðŸ”· Floor Intelligence Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Operational Floor Hierarchy</h3>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] border-slate-700 text-slate-500">SORT BY OCCUPANCY</Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockFloors.map(floor => (
                        <FloorIntelligenceCard
                            key={floor.id}
                            floor={floor}
                            isExpanded={expandedFloorId === floor.id}
                            onToggle={() => toggleFloor(floor.id)}
                        />
                    ))}
                </div>
            </div>

            {/* ðŸ”· Hardware Pulse Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AnalyticsSection title="Operational Performance (Cameras)">
                    <div className="space-y-6">
                        <CameraIntelRow label="Main Lobby Entry" events={1450} accuracy={98.5} status="Optimal" />
                        <CameraIntelRow label="Parking Exit A" events={890} accuracy={96.2} status="Stable" />
                        <CameraIntelRow label="Server Room Access" events={42} accuracy={99.8} status="Secure" />
                        <CameraIntelRow label="Cafeteria Zone" events={0} accuracy={0} status="Offline" warning />
                    </div>
                </AnalyticsSection>

                <AnalyticsSection title="High-Activity Zones">
                    <div className="space-y-6">
                        <AreaPerformanceItem name="Dev Zone Alpha" present={45} peak={65} avgStay="7.2 hrs" trend="up" />
                        <AreaPerformanceItem name="Marketing Hub" present={18} peak={32} avgStay="5.8 hrs" trend="stable" />
                        <AreaPerformanceItem name="Ground Lobby" present={12} peak={50} avgStay="0.4 hrs" trend="down" />
                        <AreaPerformanceItem name="Conference C" present={8} peak={12} avgStay="1.5 hrs" trend="up" />
                    </div>
                </AnalyticsSection>
            </div>
        </div>
    );
};

const GlobalStatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card className={cn(lightTheme.background.card, lightTheme.border.default, "shadow-lg relative overflow-hidden group", "dark:bg-slate-950 dark:border-border")}>
        <CardContent className="p-5">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110", color, lightTheme.background.secondary, "border", lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                <Icon className="w-5 h-5" />
            </div>
            <div className={cn("text-2xl font-black", lightTheme.text.primary, "dark:text-white")}>{value}</div>
            <div className={cn("text-[10px] font-bold uppercase tracking-wider mt-0.5", lightTheme.text.secondary, "dark:text-slate-500")}>{title}</div>
            <div className={cn("absolute top-2 right-2 w-1 h-1 rounded-full opacity-50", color.replace('text-', 'bg-'))} />
        </CardContent>
    </Card>
);

const FloorIntelligenceCard = ({ floor, isExpanded, onToggle }: any) => {
    const floorAreas = mockAreas.filter(a => a.floorId === floor.id);
    const floorDevices = mockDevices.filter(d => d.floorId === floor.id);
    const occupancyPercentage = Math.min(Math.round(((floor.capacity || 100) / 2) + Math.random() * 20), 100);

    return (
        <Card className={cn(
            lightTheme.background.card,
            "transition-all duration-500 overflow-hidden",
            isExpanded ? "ring-2 ring-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.1)]" : cn("hover:border-slate-300", lightTheme.border.default, "dark:hover:border-slate-700 dark:border-border"),
            "dark:bg-slate-950"
        )}>
            <CardHeader className="p-6 cursor-pointer select-none" onClick={onToggle}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn("text-4xl font-black tracking-tighter leading-none", lightTheme.text.primary, "dark:text-slate-800")}>0{floor.floorNumber || 1}</div>
                        <div>
                            <h4 className={cn("text-sm font-black transition-colors uppercase tracking-tight", lightTheme.text.primary, "group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400")}>{floor.name}</h4>
                            <div className={cn("text-[10px] font-bold tracking-widest mt-0.5 uppercase", lightTheme.text.secondary, "dark:text-slate-500")}>Operational Segment</div>
                        </div>
                    </div>
                    <div className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center transition-transform",
                        isExpanded ? "bg-blue-600 border-blue-500 text-white rotate-180" : cn(lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.secondary, "dark:bg-slate-900 dark:border-border dark:text-slate-500")
                    )}>
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Occupancy Indicator */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Current Occupancy</span>
                            <span className={cn("text-xs font-black", lightTheme.text.primary, "dark:text-white")}>{occupancyPercentage}%</span>
                        </div>
                        <div className="flex gap-1 h-2">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex-1 rounded-sm",
                                        i < occupancyPercentage / 10
                                            ? (occupancyPercentage > 85 ? "bg-rose-500" : occupancyPercentage > 60 ? "bg-amber-500" : "bg-emerald-500")
                                            : cn("bg-slate-200", "dark:bg-slate-900")
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={cn("p-3 border rounded-xl", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border/50")}>
                            <div className="flex items-center gap-2 mb-1">
                                <Users className={cn("w-3 h-3", lightTheme.text.label, "dark:text-slate-500")} />
                                <span className={cn("text-[9px] font-bold uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Employees</span>
                            </div>
                            <div className={cn("text-lg font-black", lightTheme.text.primary, "dark:text-white")}>78<span className={cn("text-[10px] ml-1", lightTheme.text.secondary, "dark:text-slate-500")}>/ 150</span></div>
                        </div>
                        <div className={cn("p-3 border rounded-xl", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border/50")}>
                            <div className="flex items-center gap-2 mb-1">
                                <Camera className={cn("w-3 h-3", lightTheme.text.label, "dark:text-slate-500")} />
                                <span className={cn("text-[9px] font-bold uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Cameras</span>
                            </div>
                            <div className={cn("text-lg font-black", lightTheme.text.primary, "dark:text-white")}>12<span className={cn("text-[10px] ml-1", lightTheme.text.secondary, "dark:text-slate-500")}>Live</span></div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <div className={cn("border-t animate-in slide-in-from-top-1 duration-500", lightTheme.border.default, lightTheme.background.secondary, "dark:border-border dark:bg-slate-900/20")}>
                    <div className="p-5">
                        <h5 className={cn("text-[10px] font-black uppercase tracking-widest mb-4", lightTheme.text.secondary, "dark:text-slate-500")}>Live Area Breakdown</h5>
                        <div className="space-y-3">
                            {floorAreas.map(area => (
                                <div key={area.id} className={cn("flex items-center justify-between p-3 border rounded-xl transition-colors cursor-pointer group", lightTheme.background.card, lightTheme.border.default, "hover:bg-slate-50", "dark:bg-slate-950 dark:border-border dark:hover:bg-slate-900")}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]",
                                            (area.currentOccupancy! / area.capacity!) > 0.8 ? "text-rose-500" :
                                                (area.currentOccupancy! / area.capacity!) > 0.5 ? "text-amber-500" : "text-emerald-500"
                                        )} />
                                        <div>
                                            <div className={cn("text-xs font-bold transition-colors group-hover:text-blue-600", lightTheme.text.primary, "dark:text-white dark:group-hover:text-blue-400")}>{area.name}</div>
                                            <div className={cn("text-[9px] uppercase tracking-widest mt-0.5", lightTheme.text.secondary, "dark:text-slate-500")}>{area.type}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn("text-xs font-black", lightTheme.text.primary, "dark:text-white")}>{area.currentOccupancy!} <span className={cn("text-[10px]", lightTheme.text.label, "dark:text-slate-500")}>IN</span></div>
                                        <div className={cn("text-[9px] font-bold tracking-tighter", lightTheme.text.secondary, "dark:text-slate-500")}>CAP: {area.capacity!}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <Button className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20">
                                <MapIcon className="w-3.5 h-3.5 mr-2" />
                                Launch Live Console
                            </Button>
                            <Button variant="ghost" className={cn("w-full h-10 text-xs uppercase tracking-widest font-black", lightTheme.text.secondary, "hover:bg-slate-100", "dark:text-slate-500 dark:hover:text-white dark:hover:bg-slate-800")}>
                                Configuration History
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

const AnalyticsSection = ({ title, children }: any) => (
    <Card className={cn("overflow-hidden", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-950 dark:border-border")}>
        <CardHeader className={cn("border-b py-4 px-6", lightTheme.border.default, "dark:border-border")}>
            <div className="flex items-center justify-between">
                <h4 className={cn("text-[10px] font-bold uppercase tracking-widest", lightTheme.text.secondary, "dark:text-slate-500")}>{title}</h4>
                <MoreVertical className={cn("w-4 h-4", lightTheme.text.muted, "dark:text-slate-600")} />
            </div>
        </CardHeader>
        <CardContent className="p-6">
            {children}
        </CardContent>
    </Card>
);

const CameraIntelRow = ({ label, events, accuracy, status, warning }: any) => (
    <div className="flex items-center justify-between group">
        <div className="flex items-center gap-4">
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                warning ? "bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-500/10 dark:border-rose-500/20" : cn(lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.secondary, "group-hover:text-blue-600 dark:bg-slate-900 dark:border-border dark:text-slate-500 dark:group-hover:text-blue-400")
            )}>
                <Camera className="w-5 h-5" />
            </div>
            <div>
                <div className={cn("text-xs font-black tracking-tight", lightTheme.text.primary, "dark:text-white")}>{label}</div>
                <div className={cn("text-[10px] font-bold mt-0.5 flex items-center gap-2", lightTheme.text.secondary, "dark:text-slate-500")}>
                    {events.toLocaleString()} Events · <span className={warning ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"}>{status}</span>
                </div>
            </div>
        </div>
        <div className="text-right">
            <div className={cn("text-xs font-black", lightTheme.text.primary, "dark:text-white")}>{accuracy}%</div>
            <div className={cn("text-[9px] font-bold uppercase tracking-tighter", lightTheme.text.secondary, "dark:text-slate-500")}>Accuracy Score</div>
        </div>
    </div>
);

const AreaPerformanceItem = ({ name, present, peak, avgStay, trend }: any) => (
    <div className={cn("flex items-center justify-between group p-3 rounded-2xl transition-all", "hover:bg-slate-50", "dark:hover:bg-slate-900/50")}>
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <div>
                <div className={cn("text-xs font-black capitalize", lightTheme.text.primary, "dark:text-white")}>{name}</div>
                <div className={cn("text-[10px] flex items-center gap-2 mt-0.5", lightTheme.text.secondary, "dark:text-slate-500")}>
                    Avg Stay: {avgStay} · <Clock className="w-2.5 h-2.5 inline" />
                </div>
            </div>
        </div>
        <div className="flex items-center gap-8">
            <div className="text-right">
                <div className={cn("text-xs font-black", lightTheme.text.primary, "dark:text-white")}>{present}<span className={cn("text-[10px] ml-1", lightTheme.text.label, "dark:text-slate-500")}>IN</span></div>
                <div className={cn("text-[9px] font-bold", lightTheme.text.secondary, "dark:text-slate-500")}>PEAK: {peak}</div>
            </div>
            <div className={cn(
                "w-8 h-8 rounded-full border flex items-center justify-center",
                lightTheme.background.secondary, lightTheme.border.default,
                "dark:bg-slate-900 dark:border-border",
                trend === 'up' ? "text-emerald-500 dark:text-emerald-400" : trend === 'down' ? "text-rose-500 dark:text-rose-400" : cn(lightTheme.text.secondary, "dark:text-slate-500")
            )}>
                {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : trend === 'down' ? <TrendingDown className="w-4 h-4" /> : <Target className="w-4 h-4" />}
            </div>
        </div>
    </div>
);

