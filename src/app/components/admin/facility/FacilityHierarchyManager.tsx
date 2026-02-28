import React, { useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Building2, Plus, ChevronRight, ChevronDown, Monitor, MapIcon, Layers } from 'lucide-react';
import { cn } from '../../ui/utils';
import { Building, Floor, Area, Device } from '../../../data/enhancedMockData';
import { useRealTimeEngine } from '../../../hooks/useRealTimeEngine';
import { lightTheme } from '../../../../theme/lightTheme';

interface FacilityHierarchyManagerProps {
    buildings: Building[];
    floors: Floor[];
    areas: Area[];
    onSelectBuilding: (b: Building) => void;
    onSelectFloor: (f: Floor) => void;
    selectedNodeId?: string;
}

export const FacilityHierarchyManager: React.FC<FacilityHierarchyManagerProps> = ({
    buildings,
    floors,
    areas,
    onSelectBuilding,
    onSelectFloor,
    selectedNodeId
}) => {
    const { devices } = useRealTimeEngine();
    const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set(buildings.map(b => b.id)));
    const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

    const toggleBuilding = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(expandedBuildings);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedBuildings(newSet);
    };

    const toggleFloor = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(expandedFloors);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedFloors(newSet);
    };

    const getDeviceStatusColor = (status: string) => {
        switch (status) {
            case 'Online': return 'bg-emerald-500';
            case 'Offline': return 'bg-rose-500';
            case 'Warning': return 'bg-amber-500';
            default: return 'bg-slate-500';
        }
    };

    const getBuildingHealth = (buildingId: string) => {
        const buildingDevices = devices.filter(d => d.buildingId === buildingId || d.location.includes(buildings.find(b => b.id === buildingId)?.name || ''));
        if (buildingDevices.length === 0) return 'bg-slate-500';
        if (buildingDevices.some(d => d.status === 'Offline')) return 'bg-rose-500';
        if (buildingDevices.some(d => d.status === 'Warning')) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    const getFloorHealth = (floorId: string) => {
        const floorDevices = devices.filter(d => d.floorId === floorId);
        if (floorDevices.length === 0) return 'bg-slate-500';
        if (floorDevices.some(d => d.status === 'Offline')) return 'bg-rose-500';
        if (floorDevices.some(d => d.status === 'Warning')) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.muted, "dark:text-slate-500")}>Facility Hierarchy</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400 hover:bg-blue-500/10">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-1">
                {buildings.map(building => {
                    const bFloors = floors.filter(f => f.buildingId === building.id);
                    const isBExpanded = expandedBuildings.has(building.id);
                    const isBSelected = selectedNodeId === building.id;

                    return (
                        <div key={building.id} className="space-y-1">
                            <button
                                onClick={() => onSelectBuilding(building)}
                                className={cn(
                                    "w-full flex items-center justify-between p-2 rounded-lg transition-all group",
                                    isBSelected ? "bg-blue-600/20 text-blue-600 dark:text-blue-400" : cn(lightTheme.text.primary, lightTheme.background.hover, "dark:text-slate-300 dark:hover:bg-slate-800/50")
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <div onClick={(e) => toggleBuilding(building.id, e)} className={cn("p-1 rounded cursor-pointer", lightTheme.background.hover, "dark:hover:bg-white/10")}>
                                        {isBExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </div>
                                    <Building2 className={cn("w-4 h-4", lightTheme.text.secondary, "dark:text-slate-500")} />
                                    <span className="text-sm font-medium">{building.name}</span>
                                </div>
                                <div className={cn("w-2 h-2 rounded-full", getBuildingHealth(building.id))} />
                            </button>

                            {isBExpanded && (
                                <div className={cn("ml-6 border-l pl-2 space-y-1", lightTheme.border.default, "dark:border-border")}>
                                    {bFloors.map(floor => {
                                        const fAreas = areas.filter(a => a.floorId === floor.id);
                                        const isFExpanded = expandedFloors.has(floor.id);
                                        const isFSelected = selectedNodeId === floor.id;

                                        return (
                                            <div key={floor.id} className="space-y-1">
                                                <button
                                                    onClick={() => onSelectFloor(floor)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-2 rounded-lg transition-all group",
                                                        isFSelected ? "bg-blue-600/20 text-blue-600 dark:text-blue-400" : cn(lightTheme.text.secondary, lightTheme.background.hover, "dark:text-slate-400 dark:hover:bg-slate-800/50")
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div onClick={(e) => toggleFloor(floor.id, e)} className={cn("p-1 rounded cursor-pointer", lightTheme.background.hover, "dark:hover:bg-white/10")}>
                                                            {fAreas.length > 0 ? (
                                                                isFExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                                                            ) : <div className="w-3 h-3" />}
                                                        </div>
                                                        <Layers className={cn("w-3 h-3", lightTheme.text.secondary, "dark:text-slate-500")} />
                                                        <span className="text-xs font-medium">{floor.name}</span>
                                                    </div>
                                                    <div className={cn("w-2 h-2 rounded-full", getFloorHealth(floor.id))} />
                                                </button>

                                                {isFExpanded && (
                                                    <div className={cn("ml-6 border-l pl-2 space-y-1 mt-1", lightTheme.border.default, "dark:border-border/50")}>
                                                        {fAreas.map(area => (
                                                            <div key={area.id} className={cn("flex items-center justify-between p-2 rounded-lg", lightTheme.background.hover, lightTheme.text.muted, "dark:hover:bg-slate-800/30 dark:text-slate-500")}>
                                                                <div className="flex items-center gap-2">
                                                                    <MapIcon className="w-3 h-3 opacity-50" />
                                                                    <span className="text-[10px] font-medium">{area.name}</span>
                                                                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full uppercase", lightTheme.background.secondary, lightTheme.text.secondary, "dark:bg-slate-800 dark:text-slate-400")}>{area.areaType || area.type}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

