import React, { useState } from 'react';
import { Area } from '../../../data/enhancedMockData';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';
import { Button } from '../../ui/button';

interface AreaDefinitionLayerProps {
    initialAreas: Area[];
    isReadOnly?: boolean;
    onSave?: (areas: Area[]) => void;
    highlightedAreaId?: string | null;
    onAreaClick?: (areaId: string) => void;
}

export const AreaDefinitionLayer: React.FC<AreaDefinitionLayerProps> = ({
    initialAreas,
    isReadOnly = false,
    onSave,
    highlightedAreaId = null,
    onAreaClick
}) => {
    const [areas, setAreas] = useState<Area[]>(initialAreas);
    const [drawingPoints, setDrawingPoints] = useState<{ x: number, y: number }[]>([]);

    const getAreaColor = (type: Area['type'] | string, isHighlighted: boolean) => {
        if (isHighlighted) return 'rgba(59, 130, 246, 0.4)'; // Highlight Blue
        switch (type) {
            case 'Staff Only': return 'rgba(59, 130, 246, 0.2)'; // Blue
            case 'Restricted': return 'rgba(245, 158, 11, 0.2)'; // Amber
            case 'High Security': return 'rgba(239, 68, 68, 0.2)'; // Red
            default: return 'rgba(16, 185, 129, 0.1)'; // Emerald/Public
        }
    };

    const getAreaBorder = (type: Area['type'] | string, isHighlighted: boolean) => {
        if (isHighlighted) return '#60a5fa'; // Brighter blue
        switch (type) {
            case 'Staff Only': return '#3b82f6';
            case 'Restricted': return '#f59e0b';
            case 'High Security': return '#ef4444';
            default: return '#10b981';
        }
    };

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isReadOnly) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDrawingPoints([...drawingPoints, { x, y }]);
    };

    const handleCompleteDrawing = () => {
        if (drawingPoints.length < 3) return;
        const newArea: Area = {
            id: `area-${Date.now()}`,
            floorId: 'fl-current',
            name: `New Zone ${areas.length + 1}`,
            type: 'Public',
            polygonCoordinates: drawingPoints,
        };
        const updatedAreas = [...areas, newArea];
        setAreas(updatedAreas);
        setDrawingPoints([]);
        if (onSave) onSave(updatedAreas);
    };

    const handleCancelDrawing = () => {
        setDrawingPoints([]);
    };

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            <svg
                className={cn("w-full h-full", !isReadOnly ? "pointer-events-auto" : "pointer-events-none")}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                onClick={handleSvgClick}
            >
                {areas.map((area) => {
                    const points = area.polygonCoordinates.map(p => `${p.x},${p.y}`).join(' ');
                    const isHighlighted = highlightedAreaId === area.id;

                    return (
                        <g
                            key={area.id}
                            className={cn(
                                "transition-all duration-300 pointer-events-auto",
                                !isReadOnly ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                            )}
                            onClick={(e) => {
                                if (isReadOnly) return;
                                e.stopPropagation();
                                onAreaClick?.(area.id);
                            }}
                        >
                            <polygon
                                points={points}
                                fill={getAreaColor(area.type, isHighlighted)}
                                stroke={getAreaBorder(area.type, isHighlighted)}
                                strokeWidth={isHighlighted ? "0.4" : "0.2"}
                                vectorEffect="non-scaling-stroke"
                                className={cn(
                                    "transition-all duration-300",
                                    isHighlighted ? "filter drop-shadow-[0_0_2px_rgba(59,130,246,0.5)]" : ""
                                )}
                            />

                            {/* Centered Label for the Area */}
                            {area.polygonCoordinates.length > 0 && (
                                <foreignObject
                                    x={area.polygonCoordinates[0].x - 5}
                                    y={area.polygonCoordinates[0].y + (area.polygonCoordinates[2]?.y - area.polygonCoordinates[0]?.y) / 2 - 2 || area.polygonCoordinates[0].y}
                                    width="10"
                                    height="5"
                                    className="overflow-visible pointer-events-none"
                                >
                                    <div className="flex flex-col items-center justify-center transform -translate-x-1/2">
                                        <Badge className={cn(
                                            "bg-slate-900/90 border-slate-700 text-slate-200 shadow-xl whitespace-nowrap px-1 py-0 text-[3px] transition-all",
                                            isHighlighted ? "border-blue-500 text-blue-400 scale-125" : ""
                                        )}>
                                            {area.name}
                                        </Badge>
                                    </div>
                                </foreignObject>
                            )}
                        </g>
                    );
                })}

                {/* Currently Drawing Polygon */}
                {drawingPoints.length > 0 && (
                    <g className="pointer-events-none">
                        {drawingPoints.length > 1 && (
                            <polygon
                                points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="rgba(99, 102, 241, 0.2)"
                                stroke="#6366f1"
                                strokeWidth="0.3"
                                strokeDasharray="1,1"
                                vectorEffect="non-scaling-stroke"
                            />
                        )}
                        {drawingPoints.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="0.5" fill="#6366f1" />
                        ))}
                    </g>
                )}
            </svg>

            {!isReadOnly && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto flex items-center gap-2">
                    {drawingPoints.length === 0 ? (
                        <div className="bg-slate-900/90 text-white px-4 py-2 rounded-full border border-indigo-500/50 text-sm shadow-xl flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            Click on the map to start drawing a new zone
                        </div>
                    ) : (
                        <div className="bg-slate-900/95 text-white p-2 rounded-xl border border-indigo-500 shadow-2xl flex items-center gap-2">
                            <span className="text-xs text-indigo-300 ml-2">{drawingPoints.length} points placed</span>
                            <div className="h-4 w-[1px] bg-slate-700 mx-2" />
                            <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white h-7 text-xs" onClick={handleCancelDrawing}>Cancel</Button>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 h-7 text-xs" onClick={handleCompleteDrawing} disabled={drawingPoints.length < 3}>Complete Zone</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
