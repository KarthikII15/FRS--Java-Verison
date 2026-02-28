import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Building2, Layers, Video, Cpu, Users, ArrowRight, Plus, Activity } from 'lucide-react';
import { mockBuildings, mockFloors, mockDevices, mockLivePresence, mockMapValidationIssues } from '../../data/enhancedMockData';
import { FloorLayoutManager } from './facility/FloorLayoutManager';
import { LiveFloorView } from './facility/LiveFloorView';
import { AccessAssignmentManager } from './facility/AccessAssignmentManager';
import { Shield, AlertTriangle, AlertCircle, Upload, Archive, MoreVertical, Search } from 'lucide-react';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

export const FacilityControlDashboard: React.FC = () => {
    const [activeView, setActiveView] = useState<'overview' | 'manage-floor' | 'live-floor' | 'access-manager'>('overview');
    const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Quick Stats
    const totalFloors = mockFloors.length;
    const totalCameras = mockDevices.filter(d => d.type === 'Camera').length;
    const totalEdgeDevices = mockDevices.filter(d => d.type === 'Edge Device').length;
    const activeOccupancy = Math.floor((mockLivePresence.length / 50) * 100); // mock calculation

    if (activeView === 'access-manager') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => setActiveView('overview')} className="mb-4">
                    ← Back to Dashboard
                </Button>
                <AccessAssignmentManager />
            </div>
        );
    }

    if (activeView === 'manage-floor') {
        return (
            <FloorLayoutManager
                floorId={selectedFloorId}
                onBack={() => {
                    setActiveView('overview');
                    setSelectedFloorId(null);
                }}
            />
        );
    }

    if (activeView === 'live-floor' && selectedFloorId) {
        return (
            <LiveFloorView
                floorId={selectedFloorId}
                onBack={() => {
                    setActiveView('overview');
                    setSelectedFloorId(null);
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className={cn("text-xl font-semibold", lightTheme.text.primary, "dark:text-white")}>Facility Intelligence</h3>
                    <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
                        Enterprise monitoring: buildings, floors, spatial zones, and security state
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setActiveView('access-manager')} className="border-indigo-500/50 text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20">
                        <Shield className="w-4 h-4 mr-2" />
                        Access Matrix
                    </Button>
                    <Button onClick={() => setActiveView('manage-floor')} className="bg-blue-600 hover:bg-blue-500">
                        <Plus className="w-4 h-4 mr-2" />
                        New Floor Map
                    </Button>
                </div>
            </div>

            {/* Validation & Alerts Panel */}
            {mockMapValidationIssues.length > 0 && (
                <Card className="bg-amber-50/50 border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/20">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                            <CardTitle className="text-sm font-bold text-amber-800 dark:text-amber-200">Map Validation Issues</CardTitle>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-500 dark:border-amber-500/30">
                            {mockMapValidationIssues.length} Issues Found
                        </Badge>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="space-y-2">
                            {mockMapValidationIssues.map(issue => (
                                <div key={issue.id} className="flex items-center justify-between p-2 rounded bg-amber-100/50 border border-amber-200/50 dark:bg-amber-500/10 dark:border-amber-500/10">
                                    <div className="flex items-center gap-3">
                                        {issue.severity === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 dark:text-red-500" /> : <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />}
                                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100/80">{issue.message}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-amber-700 hover:text-amber-900 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-500/20">
                                        Resolve →
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <p className={cn("text-sm", lightTheme.text.label, "dark:text-slate-400")}>Total Floors</p>
                                <p className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>{totalFloors}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Video className="w-6 h-6" />
                            </div>
                            <div>
                                <p className={cn("text-sm", lightTheme.text.label, "dark:text-slate-400")}>Active Cameras</p>
                                <p className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>{totalCameras}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Cpu className="w-6 h-6" />
                            </div>
                            <div>
                                <p className={cn("text-sm", lightTheme.text.label, "dark:text-slate-400")}>Edge Devices</p>
                                <p className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>{totalEdgeDevices}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className={cn("text-sm", lightTheme.text.label, "dark:text-slate-400")}>Est. Occupancy</p>
                                <p className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>{activeOccupancy}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <div className={cn("flex items-center justify-between pb-2 border-b", lightTheme.border.default, "dark:border-border")}>
                    <h4 className={cn("text-lg font-medium", lightTheme.text.primary, "dark:text-white")}>Facility Inventory</h4>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", lightTheme.text.label, "dark:text-slate-500")} />
                            <input
                                type="text"
                                placeholder="Search floors..."
                                className={cn("border rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-64", lightTheme.background.primary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-border dark:text-white")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {mockBuildings.map(building => (
                    <div key={building.id} className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Building2 className={cn("w-5 h-5", lightTheme.text.label, "dark:text-slate-400")} />
                            <h4 className={cn("text-lg font-medium", lightTheme.text.primary, "dark:text-white")}>{building.name}</h4>
                            <Badge variant="outline" className={cn("ml-2 border-transparent", lightTheme.background.secondary, lightTheme.text.label, "dark:border-slate-700 dark:text-slate-400 dark:bg-slate-900/50")}>
                                {mockFloors.filter(f => f.buildingId === building.id).length} Floors
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {mockFloors.filter(f => f.buildingId === building.id).map(floor => (
                                <Card key={floor.id} className={cn("transition-all group overflow-hidden border", lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border dark:hover:border-slate-700")}>
                                    <div className={cn("h-1 w-full", lightTheme.background.secondary, "dark:bg-slate-800")}>
                                        <div className="h-full bg-blue-500" style={{ width: `${(mockDevices.filter(d => d.floorId === floor.id).length / 10) * 100}%` }} />
                                    </div>
                                    <CardHeader className="pb-3 pt-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className={cn("text-base", lightTheme.text.primary, "dark:text-white")}>{floor.name}</CardTitle>
                                                <CardDescription className={cn("mt-1", lightTheme.text.secondary, "dark:text-slate-500")}>Floor {floor.floorNumber} • {floor.capacity || 'N/A'} Max Cap</CardDescription>
                                            </div>
                                            <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:bg-slate-200", lightTheme.text.label, "dark:text-slate-500 dark:hover:text-white dark:hover:bg-slate-800")}>
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center", lightTheme.background.secondary, lightTheme.border.card, "dark:border-[#0B101A] dark:bg-slate-800")}>
                                                        <Users className={cn("w-3 h-3", lightTheme.text.label, "dark:text-slate-400")} />
                                                    </div>
                                                ))}
                                                <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold border-white dark:border-[#0B101A] text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40")}>
                                                    +12
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("text-xs uppercase font-medium", lightTheme.text.label, "dark:text-slate-500")}>Occupancy</p>
                                                <p className="text-sm font-bold text-emerald-500 dark:text-emerald-400">24%</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn("flex-1 text-xs hover:bg-slate-200 border", lightTheme.border.default, lightTheme.text.primary, "dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:bg-transparent dark:text-slate-300")}
                                                onClick={() => {
                                                    setSelectedFloorId(floor.id);
                                                    setActiveView('manage-floor');
                                                }}
                                            >
                                                Edit Map
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs border-0"
                                                onClick={() => {
                                                    setSelectedFloorId(floor.id);
                                                    setActiveView('live-floor');
                                                }}
                                                disabled={!floor.layoutImageUrl}
                                            >
                                                Monitor
                                                <ArrowRight className="w-3 h-3 ml-1.5" />
                                            </Button>
                                        </div>
                                        <div className={cn("flex justify-between items-center mt-3 pt-3 border-t", lightTheme.border.default, "dark:border-border/50")}>
                                            <button className={cn("flex items-center gap-1.5 text-[10px] hover:text-slate-700", lightTheme.text.label, "dark:text-slate-500 dark:hover:text-slate-300")}>
                                                <Upload className="w-3 h-3" />
                                                Upload SVG
                                            </button>
                                            <button className={cn("flex items-center gap-1.5 text-[10px] hover:text-rose-600", lightTheme.text.label, "dark:text-slate-500 dark:hover:text-rose-400")}>
                                                <Archive className="w-3 h-3" />
                                                Archive
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

