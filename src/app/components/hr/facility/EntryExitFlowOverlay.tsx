import React from 'react';
import { Area, Device } from '../../../data/enhancedMockData';
import { cn } from '../../ui/utils';
import { lightTheme } from '../../../../theme/lightTheme';

interface EntryExitFlowOverlayProps {
    areas: Area[];
    devices: Device[];
}

export const EntryExitFlowOverlay: React.FC<EntryExitFlowOverlayProps> = ({ areas, devices }) => {
    // Determine flow links based on device placement
    // Typical flow: Entry Camera -> Primary Area -> Exit Camera

    // For demo purposes, let's create synthetic links between adjacent areas
    // by finding the center of each area and drawing an arrow

    const getCenter = (points: { x: number; y: number }[]) => {
        if (!points || points.length === 0) return { x: 50, y: 50 };
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    };

    const links: { start: { x: number, y: number }, end: { x: number, y: number } }[] = [];

    if (areas.length > 1) {
        // Connect Area 0 to Area 1, Area 1 to Area 2...
        for (let i = 0; i < areas.length - 1; i++) {
            links.push({
                start: getCenter(areas[i].polygonCoordinates),
                end: getCenter(areas[i + 1].polygonCoordinates)
            });
        }
    }

    return (
        <g className={cn("flow-overlay animate-in fade-in duration-700 pointer-events-none", lightTheme.text.primary, "dark:stroke-blue-500/50 stroke-current opacity-50")}>
            <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
                </marker>
            </defs>
            {links.map((link, idx) => {
                // Calculate a curved path
                const midX = (link.start.x + link.end.x) / 2;
                const midY = (link.start.y + link.end.y) / 2 - 15; // Curve up slightly

                return (
                    <path
                        key={idx}
                        d={`M ${link.start.x} ${link.start.y} Q ${midX} ${midY} ${link.end.x} ${link.end.y}`}
                        fill="none"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                        markerEnd="url(#arrowhead)"
                        className="animate-[dash_2s_linear_infinite]"
                    />
                );
            })}
        </g>
    );
};
