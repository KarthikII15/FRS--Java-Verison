import React, { useState, useRef } from 'react';
import { Area, Device } from '../../../data/enhancedMockData';
import { AreaDefinitionLayer } from './AreaDefinitionLayer';
import { DevicePlacementLayer } from './DevicePlacementLayer';
import { EntryExitFlowOverlay } from './EntryExitFlowOverlay';
import { Button } from '../../ui/button';
import { MousePointer2, Shapes, Maximize, ZoomIn, ZoomOut, Check, Image as ImageIcon, Map as MapIcon } from 'lucide-react';
import { cn } from '../../ui/utils';
import { lightTheme } from '../../../../theme/lightTheme';

interface FloorMapCanvasProps {
    layoutImageUrl: string;
    areas: Area[];
    devices: Device[];
    onSaveAreas?: (areas: Area[]) => void;
    onSaveDevices?: (devices: Device[]) => void;
    isViewOnly?: boolean;
    onReplaceImage?: () => void;
    highlightedAreaId?: string | null;
    onAreaClick?: (areaId: string) => void;
    showFlowOverlay?: boolean;
}

export const FloorMapCanvas: React.FC<FloorMapCanvasProps> = ({
    layoutImageUrl,
    areas,
    devices,
    onSaveAreas,
    onSaveDevices,
    isViewOnly = false,
    onReplaceImage,
    highlightedAreaId = null,
    onAreaClick,
    showFlowOverlay = false
}) => {
    const [mode, setMode] = useState<'view' | 'draw' | 'place-device'>('view');
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Zoom logic
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            setScale(s => Math.min(Math.max(0.5, s * zoomFactor), 4)); // clamp between 0.5x and 4x
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== 'view') return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // Track hover coordinates relative to the map SVG area
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const rawX = e.clientX - rect.left - position.x;
            const rawY = e.clientY - rect.top - position.y;

            setHoverPos({
                x: Math.max(0, Math.min(100, (rawX / (rect.width * scale)) * 100)),
                y: Math.max(0, Math.min(100, (rawY / (rect.height * scale)) * 100))
            });
        }

        if (!isDragging || mode !== 'view') return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        setHoverPos(null);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (mode !== 'view') return;
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || mode !== 'view' || e.touches.length !== 1) return;
        setPosition({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const resetView = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <div className="flex flex-col h-full space-y-4">

            {/* Tool Bar */}
            {!isViewOnly && (
                <div className={cn("flex items-center justify-between p-2 rounded-xl border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border")}>
                    <div className="flex gap-2">
                        <Button
                            variant={mode === 'view' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setMode('view')}
                            className={mode === 'view' ? 'bg-blue-600 hover:bg-blue-500 text-white' : cn(lightTheme.text.label, "hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800")}
                        >
                            <MousePointer2 className="w-4 h-4 mr-2" />
                            Pan / Select
                        </Button>
                        <Button
                            variant={mode === 'draw' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setMode('draw')}
                            className={mode === 'draw' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : cn(lightTheme.text.label, "hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800")}
                        >
                            <Shapes className="w-4 h-4 mr-2" />
                            Draw Zones
                        </Button>
                        <Button
                            variant={mode === 'place-device' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setMode('place-device')}
                            className={mode === 'place-device' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : cn(lightTheme.text.label, "hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800")}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Deploy Devices
                        </Button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <div className={cn("border rounded px-2 py-1 mr-4 hidden md:flex items-center gap-2", lightTheme.background.primary, lightTheme.border.default, "dark:bg-slate-950 dark:border-border")}>
                            <MapIcon className={cn("w-3 h-3", lightTheme.text.label, "dark:text-slate-500")} />
                            <span className={cn("text-[10px] font-mono w-24", lightTheme.text.label, "dark:text-slate-400")}>
                                {hoverPos ? `X:${hoverPos.x.toFixed(1)} Y:${hoverPos.y.toFixed(1)}` : 'X:--- Y:---'}
                            </span>
                        </div>

                        {onReplaceImage && (
                            <Button variant="outline" size="sm" onClick={onReplaceImage} className={cn("border mr-2", lightTheme.border.default, lightTheme.background.secondary, lightTheme.text.primary, "hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-800")}>
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Replace
                            </Button>
                        )}
                        <span className={cn("text-xs font-medium font-mono w-16 text-right", lightTheme.text.secondary, "dark:text-slate-500")}>
                            {Math.round(scale * 100)}%
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className={cn("h-8 w-8 hover:bg-slate-200", lightTheme.text.label, "dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800")}>
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(4, s + 0.2))} className={cn("h-8 w-8 hover:bg-slate-200", lightTheme.text.label, "dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800")}>
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={resetView} className={cn("h-8 w-8 hover:bg-slate-200 ml-2", lightTheme.text.label, "dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800")}>
                            <Maximize className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                className={cn(`relative flex-grow border rounded-xl overflow-hidden ${mode === 'view' ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-crosshair touch-none'}`, lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
            >
                <div
                    className="absolute origin-top-left transition-transform duration-100 ease-out"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        width: '100%',
                        height: '100%'
                    }}
                >
                    <div
                        className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-80"
                        style={{ backgroundImage: `url(${layoutImageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] pointer-events-none" />

                    {mode === 'draw' ? (
                        <AreaDefinitionLayer initialAreas={areas} onSave={onSaveAreas} highlightedAreaId={highlightedAreaId} onAreaClick={onAreaClick} />
                    ) : mode === 'place-device' ? (
                        <>
                            <AreaDefinitionLayer initialAreas={areas} isReadOnly highlightedAreaId={highlightedAreaId} onAreaClick={onAreaClick} />
                            <DevicePlacementLayer initialDevices={devices} onSave={onSaveDevices} />
                        </>
                    ) : (
                        <>
                            <AreaDefinitionLayer initialAreas={areas} isReadOnly highlightedAreaId={highlightedAreaId} onAreaClick={onAreaClick} />
                            <DevicePlacementLayer initialDevices={devices} isReadOnly />
                            {showFlowOverlay && <EntryExitFlowOverlay areas={areas} devices={devices} />}
                        </>
                    )}
                </div>

                {mode === 'view' && (
                    <div className={cn("absolute bottom-4 left-4 backdrop-blur-sm px-3 py-1.5 rounded flex items-center gap-2 border pointer-events-none shadow-[0px_2px_8px_rgba(0,0,0,0.05)]", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/80 dark:border-border")}>
                        <MousePointer2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        <span className={cn("text-xs font-medium", lightTheme.text.secondary, "dark:text-slate-300")}>Pan Mode Active. Scroll to zoom.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

