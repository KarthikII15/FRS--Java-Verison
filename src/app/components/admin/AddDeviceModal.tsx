import React, { useState } from 'react';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Camera,
    Cpu,
    MapPin,
    Shield,
    Network,
    CheckCircle2,
    Info,
    KeyRound
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { cn } from '../ui/utils';
import { Device } from '../../data/enhancedMockData';
import { toast } from 'sonner';
import { lightTheme } from '../../../theme/lightTheme';

interface AddDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (device: Device) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<Device>>({
        type: 'Camera',
        status: 'Online',
        deviceRole: 'Zone',
        coordinates: { x: 50, y: 50 },
    });

    if (!isOpen) return null;

    const totalSteps = 5;

    const handleNext = () => setStep(s => Math.min(s + 1, totalSteps));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = () => {
        const newDevice: Device = {
            ...formData as Device,
            id: `dev-${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`,
            lastActive: 'Just now',
            assignedPoint: formData.name || 'New Device',
            uptime: 100,
            installationDate: new Date().toISOString().split('T')[0],
            eventsToday: 0,
        };
        onAdd(newDevice);
        toast.success(`${newDevice.name} commissioned successfully!`);
        onClose();
        setStep(1);
        setFormData({ type: 'Camera', status: 'Online', deviceRole: 'Zone' });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={cn("w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border", lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                {/* Modal Header */}
                <div className={cn("p-8 border-b flex items-center justify-between", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/40 dark:border-border")}>
                    <div>
                        <h3 className={cn("text-2xl font-black tracking-tight", lightTheme.text.primary, "dark:text-white")}>Commission New Device</h3>
                        <p className={cn("text-xs font-bold uppercase tracking-widest mt-1", lightTheme.text.label, "dark:text-slate-500")}>Operational Registration Flow</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className={cn(lightTheme.text.muted, "hover:text-foreground hover:bg-slate-100 rounded-full", "dark:text-slate-500 dark:hover:text-white dark:hover:bg-slate-800")}>
                        <X className="w-6 h-6" />
                    </Button>
                </div>

                {/* Progress Bar */}
                <div className={cn("flex h-1.5 w-full", lightTheme.background.primary, "dark:bg-slate-950")}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <div
                            key={s}
                            className={cn(
                                "flex-1 transition-all duration-500",
                                step >= s ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" : cn(lightTheme.background.secondary, "dark:bg-slate-900")
                            )}
                        />
                    ))}
                </div>

                {/* Form Body */}
                <div className="p-8 min-h-[400px]">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                            <StepHeader num="01" title="Device Identity" description="Basic hardware classification and naming" />
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Device Name</Label>
                                    <Input
                                        placeholder="e.g. Lobby Entrance Cam"
                                        className={cn("h-11 border focus:ring-blue-500 focus:border-blue-500", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Serial Number</Label>
                                    <Input
                                        placeholder="SN-66291-X"
                                        className={cn("h-11 font-mono border", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}
                                        onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Hardware Type</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <TypeButton
                                        active={formData.type === 'Camera'}
                                        onClick={() => setFormData({ ...formData, type: 'Camera' })}
                                        icon={Camera}
                                        label="Visual Camera"
                                        sub="FaceMatch Enabled"
                                    />
                                    <TypeButton
                                        active={formData.type === 'Edge Device'}
                                        onClick={() => setFormData({ ...formData, type: 'Edge Device' })}
                                        icon={Cpu}
                                        label="Edge LPU"
                                        sub="Compute Gateway"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                            <StepHeader num="02" title="Spatial Placement" description="Define the physical deployment zone" />
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Building</Label>
                                    <Select onValueChange={v => setFormData({ ...formData, location: v })}>
                                        <SelectTrigger className={cn("h-11 border", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}>
                                            <SelectValue placeholder="Select Building" />
                                        </SelectTrigger>
                                        <SelectContent className={cn("border", lightTheme.background.card, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}>
                                            <SelectItem value="Building A">Innovation Tower (A)</SelectItem>
                                            <SelectItem value="Building B">Design Studio (B)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Floor / Zone</Label>
                                    <Input
                                        placeholder="e.g. Ground Floor"
                                        className={cn("h-11 border", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}
                                        onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Deployment Role</Label>
                                <div className="flex flex-wrap gap-3">
                                    {['Entry', 'Exit', 'Zone', 'Dual'].map(role => (
                                        <button
                                            key={role}
                                            onClick={() => setFormData({ ...formData, deviceRole: role as any })}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                                formData.deviceRole === role
                                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                                    : cn(lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.secondary, "hover:text-foreground", "dark:bg-slate-900 dark:border-border dark:text-slate-500 dark:hover:text-slate-300")
                                            )}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                            <StepHeader num="03" title="Networking" description="Configure IP and local gateway settings" />
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Static IP Address</Label>
                                    <Input placeholder="192.168.1.XX" className={cn("h-11 font-mono border", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                                </div>
                                <div className="space-y-2">
                                    <Label className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>MAC Address</Label>
                                    <Input placeholder="00:1B:44:..." className={cn("h-11 font-mono border", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")} />
                                </div>
                            </div>
                            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center gap-4">
                                <Network className="w-5 h-5 text-blue-500" />
                                <span className="text-xs text-blue-300">Port 8000 (HTTPS) will be used for edge-to-cloud telemetry.</span>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                            <StepHeader num="04" title="Password Authentication" description="Secure access credentials for device management" />
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <Label className={cn("text-[10px] font-black uppercase tracking-widest", lightTheme.text.label, "dark:text-slate-500")}>Admin Password</Label>
                                    <div className="relative">
                                        <KeyRound className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", lightTheme.text.muted, "dark:text-slate-500")} />
                                        <Input
                                            type="password"
                                            placeholder="Enter secure password"
                                            className={cn("pl-9 h-11 border focus:ring-blue-500 focus:border-blue-500", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.primary, "dark:bg-slate-900 dark:border-slate-700 dark:text-white")}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                    <p className={cn("text-[10px] mt-1", lightTheme.text.muted, "dark:text-slate-500")}>
                                        Must be at least 8 characters with a mix of letters, numbers, and symbols.
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-4">
                                <Shield className="w-5 h-5 text-amber-500" />
                                <span className="text-xs text-amber-600 dark:text-amber-400">Store this password securely. It will be required for future manual local access to the device OS.</span>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                            <StepHeader num="05" title="Final Assurance" description="Verify operational parameters before commissioning" />
                            <div className={cn("p-6 border rounded-2xl space-y-4", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border")}>
                                <div className="flex justify-between">
                                    <span className={cn("text-xs", lightTheme.text.label, "dark:text-slate-500")}>Commission Target</span>
                                    <span className={cn("text-xs font-bold", lightTheme.text.primary, "dark:text-white")}>{formData.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={cn("text-xs", lightTheme.text.label, "dark:text-slate-500")}>Hardware Profile</span>
                                    <span className={cn("text-xs font-bold", lightTheme.text.primary, "dark:text-white")}>{formData.type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={cn("text-xs", lightTheme.text.label, "dark:text-slate-500")}>Role & Placement</span>
                                    <span className={cn("text-xs font-bold", lightTheme.text.primary, "dark:text-white")}>{formData.deviceRole} @ {formData.location}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-emerald-500" />
                                    <span className="text-xs text-emerald-400 font-medium">Encryption Mode: AES-256 Enabled</span>
                                </div>
                                <Switch checked={true} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className={cn("p-8 border-t flex items-center justify-between", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/20 dark:border-border")}>
                    <Button
                        variant="ghost"
                        onClick={step === 1 ? onClose : handleBack}
                        className={cn(lightTheme.text.secondary, "hover:text-foreground", "dark:text-slate-400 dark:hover:text-white")}
                    >
                        {step === 1 ? 'Cancel' : (
                            <div className="flex items-center gap-2">
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </div>
                        )}
                    </Button>

                    <Button
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 h-12 shadow-lg shadow-blue-500/20"
                        onClick={step === totalSteps ? handleSubmit : handleNext}
                    >
                        {step === totalSteps ? 'Commission Device' : (
                            <div className="flex items-center gap-2">
                                Next Step
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const StepHeader = ({ num, title, description }: any) => (
    <div className="mb-6 flex items-start gap-4">
        <div className={cn("text-4xl font-black select-none", lightTheme.text.muted, "dark:text-slate-800")}>{num}</div>
        <div>
            <h4 className={cn("text-xl font-black", lightTheme.text.primary, "dark:text-white")}>{title}</h4>
            <p className={cn("text-xs mt-1", lightTheme.text.label, "dark:text-slate-500")}>{description}</p>
        </div>
    </div>
);

const TypeButton = ({ active, onClick, icon: Icon, label, sub }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full p-4 rounded-2xl border flex items-center gap-4 transition-all text-left",
            active
                ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-900/20"
                : cn(lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.secondary, "hover:border-slate-400 hover:bg-slate-100", "dark:bg-slate-900 dark:border-border dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-800/50")
        )}
    >
        <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            active ? "bg-white/10" : cn(lightTheme.background.primary, lightTheme.border.default, "border", "dark:bg-slate-800 dark:border-transparent")
        )}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <div className="text-xs font-black uppercase tracking-tight">{label}</div>
            <div className={cn("text-[10px]", active ? "text-blue-200/70" : cn(lightTheme.text.muted, "dark:text-slate-600"))}>{sub}</div>
        </div>
        {active && <CheckCircle2 className="w-4 h-4 ml-auto" />}
    </button>
);

