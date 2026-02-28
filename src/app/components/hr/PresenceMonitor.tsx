import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    Users,
    Clock,
    MapPin,
    AlertCircle,
    TrendingUp,
    Filter,
    Download,
    Loader2,
    ChevronRight,
    Bell,
    CheckCircle2,
    FileText,
    MoreVertical,
    ArrowLeft,
    Camera,
    Layers,
    Search
} from 'lucide-react';
import { toast } from 'sonner';
import { mockLivePresence, LiveOfficePresence, mockEmployees, Employee } from '../../data/enhancedMockData';
import { EmployeeProfileDashboard } from './EmployeeProfileDashboard';
import { Input } from '../ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

interface PresenceMonitorProps {
    role: 'hr' | 'admin';
}

type BehaviorCategory = 'within-shift' | 'extended-hours' | 'long-stay' | 'missing-checkout';

export const PresenceMonitor: React.FC<PresenceMonitorProps> = ({ role }) => {
    const [presenceData, setPresenceData] = useState<LiveOfficePresence[]>(mockLivePresence);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const [isExporting, setIsExporting] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    // Helper: Get behavior category based on duration and checkout
    const getBehaviorCategory = (duration: string, shiftEnd: string, isCheckoutMissing: boolean): BehaviorCategory => {
        // Parse duration string "Xh Ym"
        const hoursMatch = duration.match(/(\d+)h/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;

        // Logic based on thresholds in the plan
        if (isCheckoutMissing && hours >= 12) return 'missing-checkout';
        if (hours >= 10) return 'long-stay';

        // Simplified shift check (in a real app we'd compare actual times)
        if (hours > 8) return 'extended-hours';

        return 'within-shift';
    };

    const getCategoryTheme = (category: BehaviorCategory) => {
        switch (category) {
            case 'within-shift':
                return { label: 'Within Shift', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300', dot: 'bg-green-500' };
            case 'extended-hours':
                return { label: 'Extended Hours', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300', dot: 'bg-yellow-500' };
            case 'long-stay':
                return { label: 'Long Stay', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300', dot: 'bg-orange-500' };
            case 'missing-checkout':
                return { label: 'Missing Checkout', color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300', dot: 'bg-red-500' };
        }
    };

    const filteredData = useMemo(() => {
        return presenceData.filter(person => {
            const category = getBehaviorCategory(person.duration, person.shiftEndTime, person.status === 'Checked-In Only');

            const matchesSearch = person.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = deptFilter === 'all' || person.department === deptFilter;
            const matchesFilter = activeFilter === 'all' ||
                (activeFilter === 'missing-checkout' && category === 'missing-checkout') ||
                (activeFilter === 'long-stay' && category === 'long-stay') ||
                (activeFilter === 'extended' && category === 'extended-hours') ||
                (activeFilter === 'beyond-shift' && (category !== 'within-shift'));

            return matchesSearch && matchesDept && matchesFilter;
        });
    }, [presenceData, activeFilter, searchQuery, deptFilter]);

    const stats = {
        total: presenceData.length,
        extended: presenceData.filter(p => getBehaviorCategory(p.duration, p.shiftEndTime, p.status === 'Checked-In Only') === 'extended-hours').length,
        long: presenceData.filter(p => getBehaviorCategory(p.duration, p.shiftEndTime, p.status === 'Checked-In Only') === 'long-stay').length,
        missing: presenceData.filter(p => getBehaviorCategory(p.duration, p.shiftEndTime, p.status === 'Checked-In Only') === 'missing-checkout').length,
    };

    const handleAction = (action: string, employeeName: string) => {
        switch (action) {
            case 'remind':
                toast.success(`Reminder Sent`, { description: `A notification has been sent to ${employeeName}.` });
                break;
            case 'checkout':
                toast.success(`Checkout Marked`, { description: `${employeeName} has been manually checked out.` });
                setPresenceData(prev => prev.filter(p => p.employeeName !== employeeName));
                break;
            case 'note':
                toast(`Add HR Note`, { description: `Opening note editor for ${employeeName}...` });
                break;
        }
    };

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            setIsExporting(false);
            toast.success("Presence Report Exported", { description: "The detailed stay duration report has been generated." });
        }, 1500);
    };

    const handleViewProfile = (id: string) => {
        const emp = mockEmployees.find(e => e.id === id);
        if (emp) setSelectedEmployee(emp);
    };

    if (selectedEmployee) {
        return <EmployeeProfileDashboard employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>Presence Monitor</h3>
                        <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 dark:text-green-400">Live</span>
                        </div>
                    </div>
                    <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
                        Real-time tracking of employee presence and stay duration
                    </p>
                </div>
                <Button variant="outline" className="w-full md:w-auto" onClick={handleExport} disabled={isExporting}>
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {isExporting ? 'Generating...' : 'Export Security Report'}
                </Button>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Still in Office" value={stats.total} icon={Users} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950/30" />
                <StatCard label="Extended Hours" value={stats.extended} icon={Clock} color="text-yellow-600" bg="bg-yellow-50 dark:bg-yellow-950/30" />
                <StatCard label="Long Stay" value={stats.long} icon={TrendingUp} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-950/30" />
                <StatCard label="Missing Checkout" value={stats.missing} icon={AlertCircle} color="text-red-600" bg="bg-red-50 dark:bg-red-950/30" />
            </div>

            {/* Attention Required Panel */}
            {stats.missing > 0 && (
                <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-red-900 dark:text-red-100">Attention Required</p>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    {stats.missing} employees have exceeded 12 hours in office with no checkout detected.
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="hidden border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 md:block" onClick={() => setActiveFilter('missing-checkout')}>
                            Investigate Now
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card className={cn("border-none shadow-sm shadow-gray-200/50 dark:shadow-none", lightTheme.background.card, "dark:bg-slate-900")}>
                <CardContent className="p-4">
                    <div className="flex flex-col space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <FilterPill label="All Present" count={stats.total} active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} theme="blue" />
                            <FilterPill label="Extended (>8h)" count={stats.extended} active={activeFilter === 'extended'} onClick={() => setActiveFilter('extended')} theme="yellow" />
                            <FilterPill label="Long Stay (>10h)" count={stats.long} active={activeFilter === 'long-stay'} onClick={() => setActiveFilter('long-stay')} theme="orange" />
                            <FilterPill label="Missing Checkout" count={stats.missing} active={activeFilter === 'missing-checkout'} onClick={() => setActiveFilter('missing-checkout')} theme="red" />
                            <FilterPill label="Beyond Shift" count={stats.missing + stats.long + stats.extended} active={activeFilter === 'beyond-shift'} onClick={() => setActiveFilter('beyond-shift')} theme="purple" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search name..."
                                    className="pl-9 h-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={deptFilter} onValueChange={setDeptFilter}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    <SelectItem value="Engineering">Engineering</SelectItem>
                                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select defaultValue="all">
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Floor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Floors</SelectItem>
                                    <SelectItem value="1">Floor 1</SelectItem>
                                    <SelectItem value="2">Floor 2</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" className="text-blue-600 dark:text-blue-400 h-10 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => { setSearchQuery(''); setDeptFilter('all'); setActiveFilter('all'); }}>
                                Reset All Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Employee List */}
            <div className="space-y-4">
                {filteredData.map((person) => {
                    const category = getBehaviorCategory(person.duration, person.shiftEndTime, person.status === 'Checked-In Only');
                    const theme = getCategoryTheme(category);

                    return (
                        <Card key={person.employeeId} className={cn("hover:shadow-md transition-all group overflow-hidden", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row">
                                    {/* Left Color Strip */}
                                    <div className={`w-1 md:w-1.5 ${theme.dot}`} />

                                    <div className="flex-1 p-5">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            {/* Person Details */}
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category === 'missing-checkout' ? 'from-red-500 to-red-600' : 'from-blue-500 to-indigo-600'} flex items-center justify-center text-white text-lg font-bold shadow-sm`}>
                                                    {person.employeeName.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                        <h4 className={cn("font-bold text-lg", lightTheme.text.primary, "dark:text-white")}>{person.employeeName}</h4>
                                                        <Badge variant="outline" className="text-[10px] h-5 font-bold border-gray-200 dark:border-gray-800">{person.department}</Badge>
                                                        <Badge className={`${theme.color} border-none font-bold text-[10px] px-2 py-0.5`}>
                                                            {theme.label}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 text-sm">
                                                        <div className={cn("flex items-center gap-1.5", lightTheme.text.secondary, "dark:text-gray-400")}>
                                                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className={cn("font-medium", lightTheme.text.primary, "dark:text-gray-200")}>In: {person.checkInTime}</span>
                                                            <span className="text-xs text-gray-400">â€¢</span>
                                                            <span className="font-bold text-blue-600 dark:text-blue-400">{person.duration}</span>
                                                        </div>
                                                        <div className={cn("flex items-center gap-1.5", lightTheme.text.secondary, "dark:text-gray-400")}>
                                                            <MapPin className="w-3.5 h-3.5 text-orange-500" />
                                                            <span className="truncate">{person.location}{person.floor ? ` (${person.floor})` : ''}</span>
                                                        </div>
                                                        <div className={cn("flex items-center gap-1.5", lightTheme.text.secondary, "dark:text-gray-400")}>
                                                            <Camera className="w-3.5 h-3.5 text-purple-500" />
                                                            <span className="truncate">Last: {person.lastSeenCamera}</span>
                                                        </div>
                                                        <div className={cn("flex items-center gap-1.5", lightTheme.text.secondary, "dark:text-gray-400")}>
                                                            <Layers className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span>Shift End: {person.shiftEndTime}</span>
                                                        </div>
                                                        {person.hrNote && (
                                                            <div className={cn("flex items-center gap-1.5", lightTheme.text.secondary, "dark:text-gray-400", "col-span-1 sm:col-span-2")}>
                                                                <FileText className="w-3.5 h-3.5" />
                                                                <span className="italic text-xs font-medium truncate">Note: {person.hrNote}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex-1 md:w-full justify-start md:justify-center border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold"
                                                    onClick={() => handleViewProfile(person.employeeId)}
                                                >
                                                    View Profile
                                                    <ChevronRight className="w-3.5 h-3.5 ml-1 hidden md:block" />
                                                </Button>

                                                {role === 'hr' && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="hidden md:flex border border-gray-100 dark:border-gray-800">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => handleAction('remind', person.employeeName)} className="cursor-pointer">
                                                                <Bell className="w-4 h-4 mr-2 text-blue-500" />
                                                                Send Reminder
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleAction('checkout', person.employeeName)} className="cursor-pointer">
                                                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                                                Mark Checkout
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleAction('note', person.employeeName)} className="cursor-pointer">
                                                                <FileText className="w-4 h-4 mr-2 text-purple-500" />
                                                                Add HR Note
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}

                                                {role === 'hr' && (
                                                    <div className="flex md:hidden gap-2 flex-1">
                                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleAction('remind', person.employeeName)}>
                                                            <Bell className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleAction('checkout', person.employeeName)}>
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {filteredData.length === 0 && (
                    <Card className={cn("border-dashed border-2 py-12", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                        <CardContent className="flex flex-col items-center justify-center text-center">
                            <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4" />
                            <h4 className={cn("text-lg font-bold", lightTheme.text.primary, "dark:text-white")}>No Employees Found</h4>
                            <p className={cn("max-w-xs", lightTheme.text.secondary, "dark:text-gray-400")}>
                                No employees matching current filters are currently in the building.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: number; icon: React.FC<any>; color: string; bg: string }> = ({ label, value, icon: Icon, color, bg }) => (
    <Card className={cn("overflow-hidden border-none shadow-sm shadow-gray-200/50 dark:shadow-none", lightTheme.background.card, "dark:bg-slate-900")}>
        <CardContent className="p-5 flex items-center justify-between">
            <div>
                <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", lightTheme.text.muted, "dark:text-gray-500")}>{label}</p>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </CardContent>
    </Card>
);

const FilterPill: React.FC<{ label: string; count: number; active: boolean; onClick: () => void; theme: string }> = ({ label, count, active, onClick, theme }) => {
    const getThemeColors = () => {
        if (!active) return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700";

        switch (theme) {
            case 'yellow': return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 ring-2 ring-yellow-500/20";
            case 'orange': return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 ring-2 ring-orange-500/20";
            case 'red': return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500/20";
            case 'purple': return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-2 ring-purple-500/20";
            default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500/20";
        }
    };

    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${getThemeColors()}`}
        >
            {label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-white/40 dark:bg-black/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {count}
            </span>
        </button>
    );
};

