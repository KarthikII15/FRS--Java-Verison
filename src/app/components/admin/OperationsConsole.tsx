import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    Building2,
    Cpu,
    MapPin,
    Settings,
    AlertTriangle,
    Activity,
    Zap,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Target,
    MoreVertical
} from 'lucide-react';
import { cn } from '../ui/utils';
import { FacilityControlDashboard } from '../hr/FacilityControlDashboard';
import { DeviceCommandCenter } from './DeviceCommandCenter';
import { FacilityIntelligenceDashboard } from './FacilityIntelligenceDashboard';
import { FacilityConfiguration } from './FacilityConfiguration';
import { lightTheme } from '../../../theme/lightTheme';

export const OperationsConsole: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState('facility');

    const subTabs = [
        { id: 'facility', label: 'Facility Overview', icon: Building2 },
        { id: 'devices', label: 'Device Command', icon: Cpu },
        { id: 'map', label: 'Map Console', icon: MapPin },
        { id: 'config', label: 'Configuration', icon: Settings },
    ];

    const renderSubContent = () => {
        switch (activeSubTab) {
            case 'facility':
                return <FacilityIntelligenceDashboard />;
            case 'devices':
                return <DeviceCommandCenter />;
            case 'map':
                return <FacilityControlDashboard />;
            case 'config':
                return <FacilityConfiguration />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Sub-navigation Header */}
            <div className={cn("flex flex-wrap items-center gap-2 p-1 border rounded-xl w-fit", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border")}>
                {subTabs.map((tab) => (
                    <Button
                        key={tab.id}
                        variant="ghost"
                        onClick={() => setActiveSubTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                            activeSubTab === tab.id
                                ? cn(lightTheme.primary.main, "shadow-lg shadow-blue-900/20")
                                : cn(lightTheme.text.secondary, lightTheme.background.secondary, "hover:text-foreground", "dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 dark:bg-transparent")
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{tab.label}</span>
                    </Button>
                ))}
            </div>

            <div className="animate-in fade-in duration-500">
                {renderSubContent()}
            </div>
        </div>
    );
};

