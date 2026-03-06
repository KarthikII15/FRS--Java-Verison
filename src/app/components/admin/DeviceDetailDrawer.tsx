import React, { useState } from 'react';
import {
    X,
    Camera,
    Cpu,
    ShieldCheck,
    Calendar,
    Settings,
    Power,
    RefreshCw,
    Slash,
    Map,
    Activity,
    History,
    Info,
    Thermometer,
    Zap,
    Signal,
    CheckCircle2,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { Device } from '../../data/enhancedMockData';
import { lightTheme } from '../../../theme/lightTheme';

interface DeviceDetailDrawerProps {
    device: Device | null;
    isOpen: boolean;
    onClose: () => void;
}

export const DeviceDetailDrawer: React.FC<DeviceDetailDrawerProps> = ({ device, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'activity'>('overview');

    if (!device) return null;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div className={cn(
                "fixed inset-y-0 right-0 w-full md:w-[480px] border-l z-[70] shadow-2xl transition-transform duration-500 ease-out",
                lightTheme.background.card, lightTheme.border.default,
                "dark:bg-card dark:border-border",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className={cn("p-6 border-b", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border")}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                                    lightTheme.border.default, "dark:border-border",
                                    device.type === 'Camera' ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                                )}>
                                    {device.type === 'Camera' ? <Camera className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className={cn("text-xl font-bold leading-tight", lightTheme.text.primary, "dark:text-white")}>{device.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className={cn(
                                            "text-[9px] uppercase tracking-wider px-1.5 h-4",
                                            device.status === 'Online' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                device.status === 'Offline' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        )}>
                                            {device.status}
                                        </Badge>
                                        <span className={cn("text-[10px] font-mono", lightTheme.text.label, "dark:text-slate-500")}>{device.id}</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className={cn(lightTheme.text.muted, "hover:text-foreground hover:bg-slate-100", "dark:text-slate-500 dark:hover:text-white dark:hover:bg-slate-800")}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className={cn("flex border-b px-6", lightTheme.border.default, "dark:border-border")}>
                        {(['overview', 'health', 'activity'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-4 text-xs font-bold uppercase tracking-widest transition-all relative",
                                    activeTab === tab ? "text-blue-600 dark:text-blue-400" : cn(lightTheme.text.label, "hover:text-foreground", "dark:text-slate-500 dark:hover:text-slate-300")
                                )}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Scrolled Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                {/* Live Status Summary */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={cn("p-4 border rounded-2xl", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border")}>
                                        <div className={cn("text-[10px] uppercase tracking-wider font-bold mb-1", lightTheme.text.label, "dark:text-slate-500")}>Last Heartbeat</div>
                                        <div className={cn("text-sm font-medium flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
                                            <Zap className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                            {device.lastActive}
                                        </div>
                                    </div>
                                    <div className={cn("p-4 border rounded-2xl", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border")}>
                                        <div className={cn("text-[10px] uppercase tracking-wider font-bold mb-1", lightTheme.text.label, "dark:text-slate-500")}>Uptime Score</div>
                                        <div className={cn("text-sm font-medium flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                            {device.uptime || 99.8}%
                                        </div>
                                    </div>
                                </div>

                                {/* Metadata Section */}
                                <section>
                                    <h4 className={cn("text-[10px] uppercase tracking-widest font-black mb-4", lightTheme.text.label, "dark:text-slate-500")}>Technical Profile</h4>
                                    <div className="space-y-3">
                                        <DetailItem label="Location" value={device.location} icon={Map} />
                                        <DetailItem label="Role" value={device.deviceRole || 'Monitor'} icon={CheckCircle2} />
                                        <DetailItem label="IPv4 Address" value={device.ipAddress || 'Internal'} icon={Info} />
                                        <DetailItem label="MAC Address" value={device.macAddress || 'XX:XX:XX:XX:XX:XX'} icon={ShieldCheck} />
                                        <DetailItem label="Firmware" value={device.firmwareVersion || 'Unknown'} icon={Settings} />
                                        <DetailItem label="Serial #" value={device.serialNumber || 'SN-PLACEHOLDER'} icon={Info} />
                                    </div>
                                </section>

                                {/* Lifecycle Section */}
                                <section>
                                    <h4 className={cn("text-[10px] uppercase tracking-widest font-black mb-4", lightTheme.text.label, "dark:text-slate-500")}>Lifecycle Dashboard</h4>
                                    <div className={cn("p-5 border rounded-2xl space-y-4", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/30 dark:border-border/50")}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <Calendar className={cn("w-4 h-4", lightTheme.text.muted, "dark:text-slate-500")} />
                                                <span className={cn("text-xs underline decoration-slate-300 underline-offset-4", lightTheme.text.secondary, "dark:text-slate-300 dark:decoration-slate-700")}>Installation Date</span>
                                            </div>
                                            <span className={cn("text-xs font-mono", lightTheme.text.primary, "dark:text-white")}>{device.installationDate || 'Jan 2025'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <History className={cn("w-4 h-4", lightTheme.text.muted, "dark:text-slate-500")} />
                                                <span className={cn("text-xs underline decoration-slate-300 underline-offset-4", lightTheme.text.secondary, "dark:text-slate-300 dark:decoration-slate-700")}>Last Maintenance</span>
                                            </div>
                                            <span className={cn("text-xs font-mono", lightTheme.text.primary, "dark:text-white")}>{device.lastMaintenance || 'Oct 2025'}</span>
                                        </div>
                                        <div className="flex justify-between items-center opacity-50">
                                            <div className="flex items-center gap-3">
                                                <RefreshCw className={cn("w-4 h-4", lightTheme.text.muted, "dark:text-slate-500")} />
                                                <span className={cn("text-xs uppercase tracking-tighter", lightTheme.text.secondary, "dark:text-slate-300")}>Warranty Status</span>
                                            </div>
                                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 rounded-full font-bold">ACTIVE</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'health' && (
                            <div className="space-y-8">
                                {/* Real-time Health Metrics */}
                                <div className="space-y-6">
                                    <h4 className={cn("text-[10px] uppercase tracking-widest font-black mb-4", lightTheme.text.label, "dark:text-slate-500")}>Real-time Telemetry</h4>

                                    {device.type === 'Edge Device' ? (
                                        <div className="space-y-8">
                                            <HealthMetric label="CPU Compute Load" value={device.cpuUsage || 45} icon={Cpu} unit="%" history={device.cpuHistory} />
                                            <HealthMetric label="Memory Allocation" value={device.memoryUsage || 62} icon={Activity} unit="%" history={device.memHistory} />
                                            <HealthMetric label="Core Temperature" value={device.temperature || 42} icon={Thermometer} unit="°C" history={device.tempHistory} />
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <HealthMetric label="Network Stability" value={device.networkSignal === 'Strong' ? 98 : device.networkSignal === 'Moderate' ? 72 : 45} icon={Signal} unit="%" />
                                            <HealthMetric label="Recognition Confidence" value={device.recognitionAccuracy || 98.4} icon={ShieldCheck} unit="%" />
                                        </div>
                                    )}
                                </div>

                                {/* Diagnostic Tools */}
                                <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-start gap-4">
                                    <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="text-sm font-bold text-orange-400 mb-1">System Advisory</h5>
                                        <p className="text-xs text-orange-300 opacity-80 leading-relaxed">
                                            Periodic stability check recommended for firmware {device.firmwareVersion}. CPU peaks detected during rush hours.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="space-y-8">
                                <h4 className={cn("text-[10px] uppercase tracking-widest font-black mb-4", lightTheme.text.label, "dark:text-slate-500")}>Operational Pulse</h4>

                                <div className="space-y-6">
                                    {device.eventHistory ? (
                                        device.eventHistory.map((evt, i) => (
                                            <div key={i} className="flex gap-4 group">
                                                <div className="flex flex-col items-center">
                                                    <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center shrink-0", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900 dark:border-slate-700")}>
                                                        <Zap className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                                    </div>
                                                    {i !== device.eventHistory!.length - 1 && <div className={cn("w-px flex-grow my-1", lightTheme.background.secondary, "dark:bg-slate-800")} />}
                                                </div>
                                                <div className="pb-4">
                                                    <div className={cn("text-xs font-bold transition-colors group-hover:text-blue-600", lightTheme.text.primary, "dark:text-white dark:group-hover:text-blue-400")}>Managed {evt.count} recognition events</div>
                                                    <div className={cn("text-[10px] mt-0.5", lightTheme.text.label, "dark:text-slate-500")}>{evt.time} AM Today · Operational normal</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <Activity className={cn("w-12 h-12 mx-auto mb-4", lightTheme.text.muted, "dark:text-slate-800")} />
                                            <p className={cn("text-xs", lightTheme.text.label, "dark:text-slate-500")}>No activity logs recorded for this cycle.</p>
                                        </div>
                                    )}
                                </div>

                                <Button variant="ghost" className="w-full text-xs text-blue-400 hover:bg-blue-500/10 h-10 border border-transparent hover:border-blue-500/20">
                                    Load Full Historical Audit
                                    <ArrowRight className="w-3 h-3 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className={cn("p-6 border-t flex items-center gap-3", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border")}>
                        <Button className={cn("flex-1 gap-2 font-bold h-11 border", lightTheme.background.primary, lightTheme.border.default, lightTheme.text.primary, "hover:bg-slate-200", "dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700")}>
                            <RefreshCw className="w-4 h-4" />
                            Restart
                        </Button>
                        <Button className={cn("flex-1 gap-2 font-bold h-11 border", lightTheme.background.primary, lightTheme.border.default, lightTheme.text.primary, "hover:bg-slate-200", "dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700")}>
                            <Power className="w-4 h-4" />
                            Disable
                        </Button>
                        <Button size="icon" className="w-11 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 dark:hover:bg-blue-500">
                            <Slash className="w-4 h-4 rotate-90" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

const DetailItem = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center justify-between group">
        <div className="flex items-center gap-3">
            <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-colors", lightTheme.background.secondary, lightTheme.border.default, "group-hover:bg-slate-100", "dark:bg-slate-900/80 dark:border-border dark:group-hover:bg-slate-800")}>
                <Icon className={cn("w-3.5 h-3.5 transition-colors group-hover:text-blue-600", lightTheme.text.label, "dark:text-slate-500 dark:group-hover:text-blue-400")} />
            </div>
            <span className={cn("text-xs font-medium", lightTheme.text.secondary, "dark:text-slate-400")}>{label}</span>
        </div>
        <span className={cn("text-xs font-mono", lightTheme.text.primary, "dark:text-white")}>{value}</span>
    </div>
);

const HealthMetric = ({ label, value, icon: Icon, unit, history }: any) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border")}>
                    <Icon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <div className={cn("text-[10px] uppercase tracking-widest font-black mb-1", lightTheme.text.label, "dark:text-slate-500")}>{label}</div>
                    <div className={cn("text-lg font-black", lightTheme.text.primary, "dark:text-white")}>{value}<span className={cn("text-xs ml-1", lightTheme.text.label, "dark:text-slate-500")}>{unit}</span></div>
                </div>
            </div>

            {/* Mock Sparkline UI */}
            <div className="flex items-end gap-1 h-8">
                {(history || [20, 25, 30, 25, 20, 15, 20, 30, 45, 40]).map((h: number, i: number) => (
                    <div
                        key={i}
                        className={cn(
                            "w-1 rounded-full",
                            h > 80 ? "bg-rose-500" : h > 50 ? "bg-amber-500" : "bg-blue-500"
                        )}
                        style={{ height: `${h}%` }}
                    />
                ))}
            </div>
        </div>
        <div className={cn("w-full h-1.5 rounded-full overflow-hidden border shadow-inner", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
            <div
                className={cn(
                    "h-full transition-all duration-1000",
                    value > 80 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                        value > 50 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                )}
                style={{ width: `${value}%` }}
            />
        </div>
    </div>
);

