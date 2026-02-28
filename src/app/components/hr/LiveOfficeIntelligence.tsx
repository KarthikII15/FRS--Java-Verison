import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Users,
  Clock,
  MapPin,
  AlertCircle,
  TrendingUp,
  Filter,
  Download,
  Loader2,
  Bell,
  CheckCircle2,
  FileText,
  MoreVertical,
  ChevronRight,
  Camera,
  Layers,
  Search,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockLivePresence, LiveOfficePresence, mockEmployees } from '../../data/enhancedMockData';
import { EmployeeProfileDashboard } from './EmployeeProfileDashboard';
import { useRealTimeEngine } from '../../hooks/useRealTimeEngine';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

interface LiveOfficeIntelligenceProps {
  role?: 'hr' | 'admin';
}

type BehaviorCategory = 'within-shift' | 'extended-hours' | 'long-stay' | 'missing-checkout';

const getBehaviorCategory = (duration: string, isMissingCheckout: boolean): BehaviorCategory => {
  const hoursMatch = duration.match(/(\d+)h/);
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  if (isMissingCheckout && hours >= 12) return 'missing-checkout';
  if (hours >= 10) return 'long-stay';
  if (hours > 8) return 'extended-hours';
  return 'within-shift';
};

const getBehaviorTheme = (category: BehaviorCategory) => {
  switch (category) {
    case 'within-shift':
      return { label: 'Within Shift', color: cn(lightTheme.status.successBg, lightTheme.status.success), strip: 'bg-green-500' };
    case 'extended-hours':
      return { label: 'Extended Hours', color: cn(lightTheme.status.warningBg, lightTheme.status.warning), strip: 'bg-yellow-500' };
    case 'long-stay':
      return { label: 'Long Stay', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300', strip: 'bg-orange-500' };
    case 'missing-checkout':
      return { label: 'Missing Checkout', color: cn(lightTheme.status.errorBg, lightTheme.status.error), strip: 'bg-red-500' };
  }
};

export const LiveOfficeIntelligence: React.FC<LiveOfficeIntelligenceProps> = ({ role = 'hr' }) => {
  const { presence: presenceData, checkoutEmployee } = useRealTimeEngine();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // --- Tab 1: Live Overview State ---
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');

  // --- Tab 2: Presence Monitor State ---
  const [activeDurationFilter, setActiveDurationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const getDurationMinutes = (duration: string): number => {
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/(\d+)m/);
    return (hoursMatch ? parseInt(hoursMatch[1]) : 0) * 60 + (minutesMatch ? parseInt(minutesMatch[1]) : 0);
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast.success('Report Exported', { description: 'The live presence report has been downloaded.' });
    }, 1500);
  };

  const handleAction = (action: string, employeeName: string, employeeId: string) => {
    switch (action) {
      case 'remind':
        toast.success('Reminder Sent', { description: `A notification has been sent to ${employeeName}.` });
        break;
      case 'checkout':
        toast.success('Checkout Marked', { description: `${employeeName} has been manually checked out.` });
        checkoutEmployee(employeeId);
        break;
      case 'note':
        toast('Add HR Note', { description: `Opening note editor for ${employeeName}...` });
        break;
    }
  };

  const handleViewProfile = (employeeId: string) => {
    const emp = mockEmployees.find(e => e.id === employeeId);
    if (emp) setSelectedEmployee(emp);
  };

  // Stats
  const stats = useMemo(() => ({
    total: presenceData.length,
    overtime: presenceData.filter(p => p.status === 'Overtime').length,
    late: presenceData.filter(p => p.status === 'Late').length,
    longHours: presenceData.filter(p => getDurationMinutes(p.duration) > 480).length,
    extended: presenceData.filter(p => getBehaviorCategory(p.duration, p.status === 'Checked-In Only') === 'extended-hours').length,
    longStay: presenceData.filter(p => getBehaviorCategory(p.duration, p.status === 'Checked-In Only') === 'long-stay').length,
    missing: presenceData.filter(p => getBehaviorCategory(p.duration, p.status === 'Checked-In Only') === 'missing-checkout').length,
  }), [presenceData]);

  // Tab 1 filter
  const tabOneData = presenceData.filter(person => {
    const durationMins = getDurationMinutes(person.duration);
    switch (activeStatusFilter) {
      case 'overtime': return person.status === 'Overtime';
      case 'late': return person.status === 'Late';
      case 'long-hours': return durationMins > 480;
      case 'very-long': return durationMins > 600;
      case 'checked-in-only': return person.status === 'Checked-In Only' || !person.checkOutTime;
      default: return true;
    }
  });

  // Tab 2 filter
  const tabTwoData = presenceData.filter(person => {
    const category = getBehaviorCategory(person.duration, person.status === 'Checked-In Only');
    const matchesSearch = person.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'all' || person.department === deptFilter;
    const matchesDuration =
      activeDurationFilter === 'all' ||
      (activeDurationFilter === 'missing-checkout' && category === 'missing-checkout') ||
      (activeDurationFilter === 'long-stay' && category === 'long-stay') ||
      (activeDurationFilter === 'extended' && category === 'extended-hours') ||
      (activeDurationFilter === 'beyond-shift' && category !== 'within-shift');
    return matchesSearch && matchesDept && matchesDuration;
  });

  const statusFilters = [
    { id: 'all', label: 'All Present', count: stats.total, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
    { id: 'long-hours', label: '> 8 Hours', count: stats.longHours, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
    { id: 'very-long', label: '> 10 Hours', count: stats.overtime, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
    { id: 'late', label: 'Late Check-In', count: stats.late, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' },
    { id: 'checked-in-only', label: 'No Check-Out', count: presenceData.filter(p => !p.checkOutTime).length, color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
  ];

  if (selectedEmployee) {
    return <EmployeeProfileDashboard employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />;
  }

  return (
    <div className="space-y-6">


      {/* Internal Tabs */}
      <Tabs defaultValue="live-overview" className="space-y-6">
        <TabsList className={cn("p-1 rounded-xl h-auto border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-gray-800/60")}>
          <TabsTrigger value="live-overview" className={cn("rounded-lg px-5 py-2 font-bold data-[state=active]:shadow-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900", lightTheme.text.secondary, "dark:text-gray-400 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white")}>
            <Activity className="w-4 h-4 mr-2" />
            Live Overview
          </TabsTrigger>
          <TabsTrigger value="presence-monitor" className={cn("rounded-lg px-5 py-2 font-bold data-[state=active]:shadow-sm", "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900", lightTheme.text.secondary, "dark:text-gray-400 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white")}>
            <ShieldAlert className="w-4 h-4 mr-2" />
            Presence Monitor
            {stats.missing > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black">
                {stats.missing}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: LIVE OVERVIEW ── */}
        <TabsContent value="live-overview" className="space-y-6 focus:outline-none">
          {/* Live Count Hero Card */}
          <Card className={cn("bg-gradient-to-br from-blue-50 to-purple-50", "border-blue-200 dark:from-blue-950/20 dark:to-purple-950/20 dark:border-blue-800")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-xs font-bold uppercase tracking-wider", lightTheme.text.muted, "dark:text-gray-400")}>Live Office Count</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
                    <p className={cn("text-lg", lightTheme.text.muted, "dark:text-gray-400")}>employees present</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-300")}>Updated live</span>
                    </div>
                    <span className={cn("text-xs", lightTheme.text.muted, "dark:text-gray-400")}>•</span>
                    <span className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-300")}>Today, Feb 25, 2026</span>
                    <span className={cn("text-xs", lightTheme.text.muted, "dark:text-gray-400")}>•</span>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{stats.overtime} Overtime</span>
                    <span className={cn("text-xs", lightTheme.text.muted, "dark:text-gray-500")}>•</span>
                    <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{stats.late} Late Arrivals</span>
                  </div>
                </div>
                <div className={cn("w-20 h-20 rounded-full flex items-center justify-center shadow-lg", lightTheme.background.card, "dark:bg-gray-800")}>
                  <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveStatusFilter(filter.id)}
                className={cn(`px-4 py-2 rounded-lg text-sm font-bold transition-all`, activeStatusFilter === filter.id
                  ? filter.color + ' shadow-md ring-2 ring-offset-1 ring-current/30'
                  : cn(lightTheme.background.secondary, lightTheme.text.secondary, 'hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700')
                )}
              >
                {filter.label}
                <span className="ml-2 font-black">{filter.count}</span>
              </button>
            ))}
          </div>

          {/* Alert Cards */}
          {(stats.overtime > 0 || stats.late > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.overtime > 0 && (
                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div>
                        <p className="font-bold text-orange-900 dark:text-orange-100">
                          {stats.overtime} {stats.overtime === 1 ? 'employee' : 'employees'} working overtime
                        </p>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Monitor for well-being and compliance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {stats.late > 0 && (
                <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <p className="font-bold text-yellow-900 dark:text-yellow-100">
                          {stats.late} late {stats.late === 1 ? 'arrival' : 'arrivals'} today
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">Review attendance patterns</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Employee List */}
          <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
            <CardHeader>
              <CardTitle className={cn("text-lg", lightTheme.text.primary, "dark:text-white")}>
                {activeStatusFilter === 'all'
                  ? 'All Present Employees'
                  : `Filtered: ${statusFilters.find(f => f.id === activeStatusFilter)?.label}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tabOneData.map(person => (
                  <SimplePresenceRow key={person.employeeId} person={person} onViewProfile={() => handleViewProfile(person.employeeId)} />
                ))}
                {tabOneData.length === 0 && (
                  <div className={cn("text-center py-8", lightTheme.text.muted, "dark:text-gray-400")}>
                    <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No employees match this filter</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: PRESENCE MONITOR ── */}
        <TabsContent value="presence-monitor" className="space-y-6 focus:outline-none">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatKPICard label="Still in Office" value={stats.total} icon={Users} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950/30" />
            <StatKPICard label="Extended Hours" value={stats.extended} icon={Clock} color="text-yellow-600" bg="bg-yellow-50 dark:bg-yellow-950/30" />
            <StatKPICard label="Long Stay" value={stats.longStay} icon={TrendingUp} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-950/30" />
            <StatKPICard label="Missing Checkout" value={stats.missing} icon={AlertCircle} color="text-red-600" bg="bg-red-50 dark:bg-red-950/30" />
          </div>

          {/* Attention Required Banner */}
          {stats.missing > 0 && (
            <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 flex-shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-red-900 dark:text-red-100">Attention Required</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {stats.missing} {stats.missing === 1 ? 'employee has' : 'employees have'} exceeded 12 hours in office with no checkout detected.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="hidden md:flex shrink-0 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                  onClick={() => setActiveDurationFilter('missing-checkout')}>
                  Investigate
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Smart Filters */}
          <Card className="border-none shadow-sm shadow-gray-200/50 dark:shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <DurationPill label="All Present" count={stats.total} active={activeDurationFilter === 'all'} onClick={() => setActiveDurationFilter('all')} theme="blue" />
                <DurationPill label="Extended (>8h)" count={stats.extended} active={activeDurationFilter === 'extended'} onClick={() => setActiveDurationFilter('extended')} theme="yellow" />
                <DurationPill label="Long Stay (>10h)" count={stats.longStay} active={activeDurationFilter === 'long-stay'} onClick={() => setActiveDurationFilter('long-stay')} theme="orange" />
                <DurationPill label="Missing Checkout" count={stats.missing} active={activeDurationFilter === 'missing-checkout'} onClick={() => setActiveDurationFilter('missing-checkout')} theme="red" />
                <DurationPill label="Beyond Shift" count={stats.missing + stats.longStay + stats.extended} active={activeDurationFilter === 'beyond-shift'} onClick={() => setActiveDurationFilter('beyond-shift')} theme="purple" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search name..." className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="h-9"><SelectValue placeholder="Floor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    <SelectItem value="1">Floor 1</SelectItem>
                    <SelectItem value="2">Floor 2</SelectItem>
                    <SelectItem value="3">Floor 3</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" className="text-blue-600 dark:text-blue-400 h-9 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                  onClick={() => { setSearchQuery(''); setDeptFilter('all'); setActiveDurationFilter('all'); }}>
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rich Employee Cards */}
          <div className="space-y-3">
            {tabTwoData.map(person => {
              const category = getBehaviorCategory(person.duration, person.status === 'Checked-In Only');
              const theme = getBehaviorTheme(category);
              return (
                <Card key={person.employeeId} className={cn("overflow-hidden hover:shadow-md transition-all", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className={`w-1.5 shrink-0 ${theme.strip}`} />
                      <div className="flex-1 p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                          {/* Left: Employee Info */}
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${category === 'missing-checkout' ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-600'} flex items-center justify-center text-white font-bold text-base shadow shrink-0`}>
                              {person.employeeName.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className={cn("font-bold", lightTheme.text.primary, "dark:text-white")}>{person.employeeName}</h4>
                                <Badge variant="outline" className={cn("text-[10px] h-4 border", lightTheme.border.default, "dark:border-gray-700")}>{person.department}</Badge>
                                <Badge className={`${theme.color} border-none font-bold text-[10px] px-2 py-0`}>{theme.label}</Badge>
                              </div>
                              <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-xs", lightTheme.text.muted, "dark:text-gray-400")}>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-500" />
                                  <strong className={cn(lightTheme.text.primary, "dark:text-gray-200")}>In: {person.checkInTime}</strong>
                                  <span className={cn(lightTheme.text.muted, "dark:text-gray-500")}>·</span>
                                  <strong className="text-blue-600 dark:text-blue-400">{person.duration}</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-orange-500" />
                                  {person.location}{person.floor ? ` (${person.floor})` : ''}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-purple-500" />
                                  {person.lastSeenCamera}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-emerald-500" />
                                  Shift End: {person.shiftEndTime}
                                </span>
                                {person.hrNote && (
                                  <span className={cn("flex items-center gap-1 col-span-2", lightTheme.status.warning, "dark:text-amber-400")}>
                                    <FileText className="w-3 h-3" />
                                    <em className="truncate">{person.hrNote}</em>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                            <Button variant="ghost" size="sm"
                              className={cn("h-8 px-3 text-xs font-bold border hover:bg-slate-50", lightTheme.border.default, "dark:border-gray-800 dark:hover:bg-gray-800")}
                              onClick={() => handleViewProfile(person.employeeId)}>
                              Profile <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                            {role === 'hr' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0 border", lightTheme.border.default, "dark:border-gray-800")}>
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction('remind', person.employeeName, person.employeeId)}>
                                    <Bell className="w-4 h-4 mr-2 text-blue-500" /> Send Reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction('checkout', person.employeeName, person.employeeId)}>
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Mark Checkout
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction('note', person.employeeName, person.employeeId)}>
                                    <FileText className="w-4 h-4 mr-2 text-purple-500" /> Add HR Note
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {tabTwoData.length === 0 && (
              <Card className="border-dashed border-2 py-10">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Users className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                  <h4 className={cn("font-bold", lightTheme.text.primary, "dark:text-white")}>No Employees Found</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">No employees match current filter criteria.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────

const SimplePresenceRow: React.FC<{ person: LiveOfficePresence; onViewProfile: () => void }> = ({ person, onViewProfile }) => {
  const statusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'Late': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Overtime': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300';
      case 'Checked-In Only': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  return (
    <div className={cn("flex items-center justify-between p-4 rounded-lg transition-shadow group", lightTheme.background.card, "hover:shadow-sm dark:bg-gray-800/50")}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
          {person.employeeName.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("font-semibold", lightTheme.text.primary, "dark:text-white")}>{person.employeeName}</p>
            <Badge variant="secondary" className="text-xs">{person.department}</Badge>
          </div>
          <div className={cn("flex items-center gap-4 mt-1 text-sm flex-wrap", lightTheme.text.secondary, "dark:text-gray-400")}>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />In: {person.checkInTime}</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{person.duration}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /><span className="truncate">{person.location}</span></span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <Badge className={`${statusColor(person.status)} text-xs font-medium px-3 py-1 flex-shrink-0 border-none`}>
          {person.status}
        </Badge>
        <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity border", lightTheme.border.default, "dark:border-gray-700")}
          onClick={onViewProfile}>
          View
        </Button>
      </div>
    </div>
  );
};

const StatKPICard: React.FC<{ label: string; value: number; icon: React.FC<any>; color: string; bg: string }> = ({ label, value, icon: Icon, color, bg }) => (
  <Card className={cn("border-none shadow-sm dark:shadow-none", lightTheme.background.card)}>
    <CardContent className="p-5 flex items-center justify-between">
      <div>
        <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", lightTheme.text.muted, "dark:text-gray-500")}>{label}</p>
        <p className={`text-3xl font-black ${color}`}>{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </CardContent>
  </Card>
);

const DurationPill: React.FC<{ label: string; count: number; active: boolean; onClick: () => void; theme: string }> = ({ label, count, active, onClick, theme }) => {
  const activeColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500/20',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 ring-2 ring-yellow-500/20',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 ring-2 ring-orange-500/20',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500/20',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-2 ring-purple-500/20',
  };
  return (
    <button onClick={onClick}
      className={cn("px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap", active ? activeColors[theme] : cn(lightTheme.background.secondary, lightTheme.text.secondary, 'hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'))}>
      {label}
      <span className={cn("px-1.5 py-0.5 rounded-md text-[10px]", active ? 'bg-white/40 dark:bg-black/20' : cn(lightTheme.background.card, "dark:bg-gray-700"))}>
        {count}
      </span>
    </button>
  );
};

