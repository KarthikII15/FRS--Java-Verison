import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    Building2,
    Settings,
    Save,
    Trash2,
    Globe,
    Layers,
    Map as MapIcon,
    Upload
} from 'lucide-react';
import { mockBuildings, mockFloors, mockAreas, Building, Floor } from '../../data/enhancedMockData';
import { toast } from 'sonner';
import { FacilityHierarchyManager } from './facility/FacilityHierarchyManager';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

export const FacilityConfiguration: React.FC = () => {
    const [buildings, setBuildings] = useState<Building[]>(mockBuildings);
    const [floors, setFloors] = useState<Floor[]>(mockFloors);

    // selectedNode can be a Building or a Floor
    const [selectedNodeId, setSelectedNodeId] = useState<string>(mockBuildings[0]?.id);
    const [selectedNodeType, setSelectedNodeType] = useState<'building' | 'floor'>('building');

    const activeBuilding = buildings.find(b => b.id === selectedNodeId);
    const activeFloor = floors.find(f => f.id === selectedNodeId);

    const handleSave = () => {
        toast.success("Facility parameters synchronized with edge gateway.");
    };

    const renderBuildingDetails = (building: Building) => {
        return (
            <Card className={cn("overflow-hidden shadow-2xl transition-colors border", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-950 dark:border-border")}>
                <CardHeader className={cn("border-b p-6", lightTheme.border.default, lightTheme.background.secondary, "dark:bg-slate-900/20 dark:border-border")}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className={cn("text-xl font-black", lightTheme.text.primary, "dark:text-white")}>Building Parameters</CardTitle>
                                <p className={cn("text-xs font-medium", lightTheme.text.secondary, "dark:text-slate-500")}>Configuring {building.name}</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 gap-2 rounded-xl"
                        >
                            <Save className="w-4 h-4" />
                            Sync Changes
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Building Designation</Label>
                            <Input defaultValue={building.name} className={cn("h-12 font-bold text-base focus:ring-blue-500 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Status</Label>
                            <Select defaultValue={building.status}>
                                <SelectTrigger className={cn("h-12 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className={cn("border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-800 dark:border-slate-700 dark:text-white")}>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Timezone</Label>
                            <Input defaultValue={building.timezone || 'UTC'} className={cn("h-12 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Total Floors</Label>
                            <Input type="number" defaultValue={building.numberOfFloors || 0} className={cn("h-12 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Primary Operational Address</Label>
                        <div className="relative">
                            <Globe className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", lightTheme.text.label, "dark:text-slate-500")} />
                            <Input defaultValue={building.address} className={cn("h-12 pl-12 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderFloorDetails = (floor: Floor) => {
        return (
            <Card className={cn("transition-colors overflow-hidden shadow-2xl border", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-950 dark:border-border")}>
                <CardHeader className={cn("border-b p-6", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/20 dark:border-border")}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className={cn("text-xl font-black", lightTheme.text.primary, "dark:text-white")}>Floor Parameters</CardTitle>
                                <p className={cn("text-xs font-medium", lightTheme.text.secondary, "dark:text-slate-500")}>Configuring {floor.name}</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleSave}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-6 gap-2 rounded-xl"
                        >
                            <Save className="w-4 h-4" />
                            Sync Changes
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Floor Designation</Label>
                            <Input defaultValue={floor.name} className={cn("h-12 font-bold text-base focus:ring-indigo-500 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Floor Level Number</Label>
                            <Input type="number" defaultValue={floor.floorNumber} className={cn("h-12 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Map Scale (px/m)</Label>
                            <Input type="number" defaultValue={floor.mapScale || 100} className={cn("h-12 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Orientation (deg)</Label>
                            <Input type="number" defaultValue={floor.orientation || 0} className={cn("h-12 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                        <div className="space-y-3">
                            <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Capacity</Label>
                            <Input type="number" defaultValue={floor.capacity || 0} className={cn("h-12 border", lightTheme.background.primary, lightTheme.text.primary, lightTheme.border.input, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em]", lightTheme.text.label, "dark:text-slate-500")}>Floor Plan Map</Label>
                        <div className={cn("border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer", lightTheme.border.default, lightTheme.background.card, "hover:bg-slate-50 dark:hover:bg-slate-900/50 dark:border-slate-700 dark:bg-transparent")}>
                            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors", lightTheme.background.secondary, "dark:bg-slate-800")}>
                                <Upload className={cn("w-5 h-5", lightTheme.text.muted, "dark:text-slate-400")} />
                            </div>
                            <h4 className={cn("text-sm font-bold mb-1", lightTheme.text.primary, "dark:text-white")}>Upload Layout Image</h4>
                            <p className={cn("text-[10px] max-w-xs", lightTheme.text.secondary, "dark:text-slate-500")}>PNG, JPG or SVG up to 10MB. Map must be accurately scaled for spatial features to work.</p>
                            {floor.layoutImageUrl && (
                                <div className="mt-4 text-xs text-indigo-500 dark:text-indigo-400 font-medium flex items-center gap-1">
                                    <MapIcon className="w-3 h-3" />
                                    Current map version: {floor.mapVersion || 'v1.0'}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ðŸ”· Sidebar: Hierarchy Tree */}
            <div className="lg:col-span-4 space-y-4">
                <Card className={cn("p-4 min-h-[500px] border", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-950 dark:border-border")}>
                    <FacilityHierarchyManager
                        buildings={buildings}
                        floors={floors}
                        areas={mockAreas}
                        selectedNodeId={selectedNodeId}
                        onSelectBuilding={(b) => { setSelectedNodeId(b.id); setSelectedNodeType('building'); }}
                        onSelectFloor={(f) => { setSelectedNodeId(f.id); setSelectedNodeType('floor'); }}
                    />
                </Card>
            </div>

            {/* ðŸ”· Main Config Panel */}
            <div className="lg:col-span-8 space-y-6">
                {selectedNodeType === 'building' && activeBuilding && renderBuildingDetails(activeBuilding)}
                {selectedNodeType === 'floor' && activeFloor && renderFloorDetails(activeFloor)}

                {!activeBuilding && !activeFloor && (
                    <div className={cn("h-96 flex flex-col items-center justify-center text-center p-12 border border-dashed rounded-[32px] transition-colors", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-950 dark:border-border")}>
                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-6", lightTheme.background.secondary, "dark:bg-slate-900")}>
                            <Settings className={cn("w-8 h-8", lightTheme.text.label, "dark:text-slate-700")} />
                        </div>
                        <h3 className={cn("text-xl font-bold mb-2", lightTheme.text.primary, "dark:text-white")}>No Node Selected</h3>
                        <p className={cn("text-sm max-w-xs mx-auto", lightTheme.text.secondary, "dark:text-slate-500")}>Select a building or floor from the hierarchy to manage parameters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

