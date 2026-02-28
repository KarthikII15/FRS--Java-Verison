import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { ArrowLeft, Upload, Image as ImageIcon, Map, Check } from 'lucide-react';
import { mockFloors, Floor, mockAreas, mockDevices } from '../../../data/enhancedMockData';
import { FloorMapCanvas } from './FloorMapCanvas';
import { MapValidationPanel } from './MapValidationPanel';
import { cn } from '../../ui/utils';
import { lightTheme } from '../../../../theme/lightTheme';

interface FloorLayoutManagerProps {
    floorId: string | null;
    onBack: () => void;
}

export const FloorLayoutManager: React.FC<FloorLayoutManagerProps> = ({ floorId, onBack }) => {
    const existingFloor = floorId ? mockFloors.find(f => f.id === floorId) : null;
    const floorAreas = floorId ? mockAreas.filter(a => a.floorId === floorId) : [];
    const floorDevices = floorId ? mockDevices.filter(d => d.floorId === floorId) : [];

    const [floorName, setFloorName] = useState(existingFloor?.name || '');
    const [floorNumber, setFloorNumber] = useState<number | ''>(existingFloor?.floorNumber || '');
    const [layoutImage, setLayoutImage] = useState<string | null>(existingFloor?.layoutImageUrl || null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUploadClick = () => {
        // Simulate image upload
        setIsUploading(true);
        setTimeout(() => {
            setLayoutImage('/floorplans/sample-floorplan.svg');
            setIsUploading(false);
        }, 1500);
    };

    const handleSave = () => {
        // In a real app, save to backend
        console.log("Saving Floor", { floorName, floorNumber, layoutImage });
        onBack();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </Button>
                <div>
                    <h3 className="text-xl font-semibold text-foreground">
                        {existingFloor ? 'Edit Floor Layout' : 'Add New Floor'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Configure spatial mapping and base floorplan for the facility
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className={cn("border", lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                        <CardHeader>
                            <CardTitle className={cn("text-lg", lightTheme.text.primary, "dark:text-white")}>Floor Details</CardTitle>
                            <CardDescription className={cn(lightTheme.text.secondary, "dark:text-slate-400")}>Basic information about this level</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="floor-name" className={cn(lightTheme.text.secondary, "dark:text-slate-300")}>Floor Name</Label>
                                <Input
                                    id="floor-name"
                                    value={floorName}
                                    onChange={(e) => setFloorName(e.target.value)}
                                    placeholder="e.g., Ground Floor - Reception"
                                    className={cn("border", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="floor-number" className={cn(lightTheme.text.secondary, "dark:text-slate-300")}>Floor Number</Label>
                                <Input
                                    id="floor-number"
                                    type="number"
                                    value={floorNumber}
                                    onChange={(e) => setFloorNumber(parseInt(e.target.value))}
                                    placeholder="e.g., 1"
                                    className={cn("border", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}
                                />
                            </div>

                            <div className={cn("pt-4 border-t", lightTheme.border.default, "dark:border-border/50")}>
                                <Button className={cn("w-full transition-colors", lightTheme.background.primary, lightTheme.text.primary, "hover:bg-slate-200 border", lightTheme.border.default, "dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 dark:border-blue-500")} onClick={handleSave}>
                                    Save Configuration
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Validation Panel placed dynamically to give immediate feedback */}
                    <MapValidationPanel areas={floorAreas} devices={floorDevices} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <Card className={cn("h-full min-h-[500px] flex flex-col border", lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                        <CardHeader>
                            <CardTitle className={cn("text-lg flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
                                <Map className="w-5 h-5 text-blue-500" />
                                Floor Map Asset
                            </CardTitle>
                            <CardDescription className={cn(lightTheme.text.secondary, "dark:text-slate-400")}>
                                Upload a pristine PNG, JPG, or SVG mapping of the floor.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col">
                            {layoutImage ? (
                                <div className={cn("flex-grow relative rounded-xl border border-dashed flex items-center justify-center p-4 overflow-hidden", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-slate-700")}>
                                    <div className="absolute inset-0 w-full h-full">
                                        <FloorMapCanvas
                                            layoutImageUrl={layoutImage}
                                            areas={floorAreas}
                                            devices={floorDevices}
                                            onSaveAreas={(areas) => console.log('Saved areas:', areas)}
                                            onSaveDevices={(devices) => console.log('Saved devices:', devices)}
                                            onReplaceImage={handleUploadClick}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className={cn("flex-grow rounded-xl border-2 border-dashed flex items-center justify-center flex-col gap-4 p-6 transition-all hover:border-blue-500/50 hover:bg-blue-50/50 group cursor-pointer", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-slate-700 dark:hover:bg-blue-500/5")} onClick={handleUploadClick}>
                                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300", lightTheme.background.primary, lightTheme.border.default, "dark:bg-slate-800 dark:border-transparent")}>
                                        {isUploading ? (
                                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Upload className={cn("w-8 h-8 group-hover:text-white", lightTheme.text.muted, "dark:text-slate-400")} />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className={cn("text-base font-medium transition-colors group-hover:text-blue-600", lightTheme.text.secondary, "dark:text-slate-300 dark:group-hover:text-blue-400")}>
                                            {isUploading ? 'Uploading Map...' : 'Click to Upload Map Image'}
                                        </p>
                                        <p className={cn("text-sm mt-1 max-w-sm", lightTheme.text.label, "dark:text-slate-500")}>
                                            Supports SVG, PNG, and high-res JPG formats up to 10MB. Vector formats are recommended for zoom quality.
                                        </p>
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


