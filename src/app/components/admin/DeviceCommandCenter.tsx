import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
    Camera,
    Cpu,
    Search,
    Filter,
    Plus,
    Power,
    Settings,
    Activity,
    Thermometer,
    Zap,
    Signal,
    MoreVertical,
    ArrowUpRight,
    AlertTriangle,
    History
} from 'lucide-react';
import { cn } from '../ui/utils';
import { mockDevices, mockDeviceAlerts, Device } from '../../data/enhancedMockData';
import { lightTheme } from '../../../theme/lightTheme';
import { DeviceDetailDrawer } from './DeviceDetailDrawer';
import { AddDeviceModal } from './AddDeviceModal';
import { DeviceAlertsPanel } from './DeviceAlertsPanel';
import { useRealTimeEngine } from '../../hooks/useRealTimeEngine';

export const DeviceCommandCenter: React.FC = () => {
    const { devices, alerts, addDevice } = useRealTimeEngine();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeType, setActiveType] = useState<'All' | 'Camera' | 'Edge Device'>('All');
    const [activeStatus, setActiveStatus] = useState<'All' | 'Online' | 'Offline' | 'Warning'>('All');
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [streamIndex, setStreamIndex] = useState(0);

    // Filter logic
    const filteredDevices = devices.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = activeType === 'All' || d.type === activeType;
        const matchesStatus = activeStatus === 'All' || d.status === activeStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    // Summary counts
    const stats = {
        total: devices.length,
        camerasOnline: devices.filter(d => d.type === 'Camera' && d.status === 'Online').length,
        camerasOffline: devices.filter(d => d.type === 'Camera' && d.status === 'Offline').length,
        edgeOnline: devices.filter(d => d.type === 'Edge Device' && d.status === 'Online').length,
        edgeOffline: devices.filter(d => d.type === 'Edge Device' && d.status === 'Offline').length,
        eventsToday: devices.reduce((sum, d) => sum + (d.eventsToday || 0), 0),
        totalWarnings: devices.filter(d => d.status === 'Warning' || d.warningState).length
    };

    // Live Stream Simulation
    const liveMonitoringFeed = [
        { title: "Camera Lobby Entry Online", status: "success", time: "10:12 AM" },
        { title: "Edge Device Floor 3 CPU at 91%", status: "warning", time: "10:17 AM" },
        { title: "Parking Gate Reconnected", status: "success", time: "10:22 AM" },
        { title: "Server Room Temp Warning", status: "error", time: "10:25 AM" },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStreamIndex(prev => (prev + 1) % liveMonitoringFeed.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const openDetails = (device: Device) => {
        setSelectedDevice(device);
        setIsDetailOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* ðŸ”· Summary HUD */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard title="Total Devices" value={stats.total} icon={Zap} color="text-blue-500" />
                <StatCard title="Cameras Online" value={stats.camerasOnline} icon={Camera} color="text-emerald-500" />
                <StatCard title="Cameras Offline" value={stats.camerasOffline} icon={Camera} color="text-rose-500" />
                <StatCard title="Edge Online" value={stats.edgeOnline} icon={Cpu} color="text-emerald-500" />
                <StatCard title="Issues / Warnings" value={stats.totalWarnings} icon={AlertTriangle} color="text-amber-500" />
                <StatCard title="Events Today" value={stats.eventsToday.toLocaleString()} icon={Activity} color="text-indigo-500" />
            </div>

            {/* ðŸ”· Live Monitor Strip */}
            <div className={cn("rounded-xl px-4 py-2 flex items-center justify-between overflow-hidden relative border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 h-1.5 w-1.5 shrink-0">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                        </span>
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Live Monitor</span>
                </div>

                <div className="flex items-center gap-8 overflow-hidden">
                    <div className="animate-in slide-in-from-right-full duration-500 flex items-center gap-2 whitespace-nowrap" key={streamIndex}>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            liveMonitoringFeed[streamIndex].status === "success" ? "bg-emerald-500" :
                                liveMonitoringFeed[streamIndex].status === "warning" ? "bg-amber-500" : "bg-rose-500"
                        )} />
                        <span className={cn("text-xs font-medium", lightTheme.text.primary, "dark:text-white")}>{liveMonitoringFeed[streamIndex].title}</span>
                        <span className={cn("text-[10px]", lightTheme.text.label, "dark:text-slate-500")}>{liveMonitoringFeed[streamIndex].time}</span>
                    </div>
                </div>

                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                    View Raw Stream
                </Button>
            </div>

            {/* ðŸ”· Main Command Table */}
            <Card className={cn("overflow-hidden shadow-2xl", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-950 dark:border-border")}>
                <CardHeader className={cn("border-b py-4", lightTheme.border.default, "dark:border-border")}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative w-64">
                                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", lightTheme.text.muted, "dark:text-slate-500")} />
                                <Input
                                    placeholder="Search device, name, or IP..."
                                    className={cn("pl-9 h-9 rounded-lg border focus:ring-blue-500", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className={cn("flex rounded-lg p-0.5 border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                                {(['All', 'Camera', 'Edge Device'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setActiveType(type)}
                                        className={cn(
                                            "px-3 py-1 text-xs rounded-md transition-all",
                                            activeType === type
                                                ? cn("shadow-sm text-white", lightTheme.background.primary, "dark:bg-slate-700 dark:text-white")
                                                : cn(lightTheme.text.secondary, "hover:text-foreground dark:text-slate-500 dark:hover:text-slate-300")
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn("h-9 border", lightTheme.border.default, lightTheme.background.secondary, lightTheme.text.primary, "hover:bg-slate-100", "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")}
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Advanced Filters
                            </Button>
                            <Button
                                onClick={() => setIsAddModalOpen(true)}
                                className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-900/20"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Device
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={cn("text-[10px] uppercase font-bold tracking-widest border-b", lightTheme.background.secondary, lightTheme.text.secondary, lightTheme.border.default, "dark:bg-slate-900/30 dark:text-slate-500 dark:border-border")}>
                                    <th className="px-5 py-4">Device Identity</th>
                                    <th className="px-5 py-4">Location & Role</th>
                                    <th className="px-5 py-4">Status & Uptime</th>
                                    <th className="px-5 py-4">Ops Activity</th>
                                    <th className="px-5 py-4">Pulse / Health</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={cn("divide-y", lightTheme.border.default, "dark:divide-slate-800/50")}>
                                {filteredDevices.map(device => (
                                    <tr
                                        key={device.id}
                                        className={cn("group transition-colors cursor-pointer", "hover:bg-slate-50", "dark:hover:bg-slate-900/40")}
                                        onClick={() => openDetails(device)}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner",
                                                    lightTheme.border.default, "dark:border-border",
                                                    device.type === 'Camera' ? "bg-blue-50 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400" : "bg-purple-50 text-purple-600 dark:bg-purple-500/5 dark:text-purple-400"
                                                )}>
                                                    {device.type === 'Camera' ? <Camera className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className={cn("text-sm font-semibold transition-colors group-hover:text-blue-600", lightTheme.text.primary, "dark:text-white dark:group-hover:text-blue-400")}>{device.name}</div>
                                                    <div className={cn("text-[10px] font-mono flex items-center gap-2 mt-0.5", lightTheme.text.label, "dark:text-slate-500")}>
                                                        {device.id} · {device.ipAddress || 'No IP'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className={cn("text-xs font-medium", lightTheme.text.primary, "dark:text-slate-300")}>
                                                {device.location}
                                            </div>
                                            <div className={cn("text-[10px] mt-1 flex items-center gap-1.5", lightTheme.text.secondary, "dark:text-slate-500")}>
                                                <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 uppercase tracking-tighter", lightTheme.background.card, lightTheme.border.default, lightTheme.text.secondary, "dark:bg-slate-950 dark:border-border dark:text-slate-400")}>
                                                    {device.deviceRole || 'Monitor'}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    device.status === 'Online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                                        device.status === 'Offline' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-amber-500"
                                                )} />
                                                <span className={cn("text-xs font-semibold", lightTheme.text.primary, "dark:text-white")}>{device.status}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-16 h-1 rounded-full overflow-hidden", lightTheme.background.secondary, "dark:bg-slate-800")}>
                                                    <div
                                                        className="h-full bg-blue-500"
                                                        style={{ width: `${device.uptime || 100}%` }}
                                                    />
                                                </div>
                                                <span className={cn("text-[10px]", lightTheme.text.secondary, "dark:text-slate-500")}>{device.uptime || 100}% uptime</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className={cn("text-xs font-mono", lightTheme.text.primary, "dark:text-slate-200")}>
                                                {device.eventsToday?.toLocaleString() || 0} evts
                                            </div>
                                            <div className={cn("text-[10px] mt-1", lightTheme.text.secondary, "dark:text-slate-500")}>
                                                Last Rec: {device.lastRecognitionTime ? new Date(device.lastRecognitionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-4">
                                                {device.type === 'Edge Device' ? (
                                                    <div className="space-y-1">
                                                        <div className={cn("flex justify-between text-[8px] px-0.5", lightTheme.text.muted, "dark:text-slate-500")}>
                                                            <span>CPU</span>
                                                            <span className={cn(device.cpuUsage! > 80 ? "text-rose-500 dark:text-rose-400" : cn(lightTheme.text.muted, "dark:text-slate-400"))}>{device.cpuUsage}%</span>
                                                        </div>
                                                        <div className={cn("w-16 h-1 rounded-full overflow-hidden", lightTheme.background.secondary, "dark:bg-slate-800")}>
                                                            <div className={cn("h-full", device.cpuUsage! > 80 ? "bg-rose-500" : "bg-blue-500")} style={{ width: `${device.cpuUsage}%` }} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <Signal className={cn("w-4 h-4", device.networkSignal === 'Strong' ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500 dark:text-amber-400")} />
                                                        <Thermometer className={cn("w-4 h-4", lightTheme.text.muted, "dark:text-slate-500")} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:bg-slate-100", lightTheme.text.secondary, "hover:text-foreground dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800")} onClick={(e) => { e.stopPropagation(); /* actions */ }}>
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ðŸ”· Alerts System Panel */}
            <DeviceAlertsPanel alerts={alerts} />

            <DeviceDetailDrawer
                device={devices.find(d => d.id === selectedDevice?.id) || null}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
            />

            <AddDeviceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={(newDev: Device) => addDevice(newDev)}
            />
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card className={cn(lightTheme.background.card, lightTheme.border.default, "shadow-xl overflow-hidden group", "dark:bg-slate-950 dark:border-border")}>
        <CardContent className="p-4 relative">
            <div className="flex items-center justify-between mb-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", color, lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                    <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", lightTheme.text.muted, "dark:text-slate-600")} />
            </div>
            <div>
                <div className={cn("text-xl font-black", lightTheme.text.primary, "dark:text-white")}>{value}</div>
                <div className={cn("text-[10px] font-bold uppercase tracking-wider mt-0.5", lightTheme.text.secondary, "dark:text-slate-500")}>{title}</div>
            </div>
            {/* Subtle glow effect */}
            <div className={cn("absolute -bottom-4 -right-4 w-12 h-12 rounded-full blur-2xl opacity-10", color.replace('text-', 'bg-'))} />
        </CardContent>
    </Card>
);

