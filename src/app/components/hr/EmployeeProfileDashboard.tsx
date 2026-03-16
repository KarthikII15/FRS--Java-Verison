import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Clock,
    Briefcase,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    FileText,
    Sparkles,
    Camera,
    Activity
} from 'lucide-react';
import { Employee, LeaveRequest, mockLivePresence } from '../../data/enhancedMockData';
import { mockLeaveRequests } from '../../data/enhancedMockData';
import { AttendanceRecord, AIInsight } from '../../types';
import { mockAttendanceRecords, mockAIInsights } from '../../utils/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import { FaceEnrollButton } from './FaceEnrollButton';

interface EmployeeProfileDashboardProps {
    employee: any;
    onBack: () => void;
}

export const EmployeeProfileDashboard: React.FC<EmployeeProfileDashboardProps> = ({ employee, onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');

    // Filter mock data for this specific employee
    const employeeAttendance = mockAttendanceRecords.filter((r: AttendanceRecord) => r.employeeId === employee.id);
    const employeeLeaves = mockLeaveRequests.filter((r: LeaveRequest) => r.employeeId === employee.id) || [];
    const todayPresence = mockLivePresence.find(p => p.employeeId === employee.id);

    // Create some specific mock data if none exists
    const isGoodStanding = employee.status === 'Active';

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active':
                return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
            case 'On Leave':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
            case 'Inactive':
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    // Mock weekly hours chart data
    const weeklyHoursData = [
        { day: 'Mon', hours: 8.5 },
        { day: 'Tue', hours: 9.1 },
        { day: 'Wed', hours: 8.0 },
        { day: 'Thu', hours: 8.8 },
        { day: 'Fri', hours: 7.5 },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            {/* Back Navigation */}
            <Button variant="ghost" className="mb-2 -ml-4 hover:bg-transparent" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Directory
            </Button>

            {/* Profile Header Card */}
            <Card className={cn("bg-gradient-to-r from-blue-50 to-indigo-50 border-none shadow-md overflow-hidden relative", "dark:from-blue-950/20 dark:to-indigo-950/20")}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <CardContent className="pt-8 pb-8 relative z-10">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
                            {employee.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>

                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className={cn("text-3xl font-bold", lightTheme.text.primary, "dark:text-white")}>{employee.name}</h2>
                                        <Badge className={`${getStatusColor(employee.status)} px-3 py-1 text-sm rounded-full`}>
                                            {employee.status}
                                        </Badge>
                                    </div>
                                    <p className={cn("text-lg", lightTheme.text.secondary, "dark:text-gray-300 mb-4")}>{employee.role || employee.position || 'Employee'}</p>

                                    <div className={cn("flex flex-wrap items-center gap-4 text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>
                                        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md", lightTheme.background.secondary, "dark:bg-gray-900/50")}>
                                            <Briefcase className="w-4 h-4 text-blue-500" />
                                            <span className={cn("font-medium", lightTheme.text.primary, "dark:text-gray-200")}>{employee.department}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-4 h-4" />
                                            <span>{employee.email}</span>
                                        </div>
                                        {employee.phoneNumber && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-4 h-4" />
                                                <span>{employee.phoneNumber}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            <span>Joined {new Date(employee.joinDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 min-w-[140px]">
                                    <div className={cn("rounded-xl p-3 shadow-sm border text-center", lightTheme.background.card, lightTheme.border.default, "dark:bg-gray-800 dark:border-gray-700")}>
                                        <p className={cn("text-xs mb-1", lightTheme.text.muted, "dark:text-gray-400")}>Employee ID</p>
                                        <p className={cn("font-mono font-bold", lightTheme.text.primary, "dark:text-white")}>{employee.employeeId}</p>
                                    </div>
                                    <div className={cn("rounded-xl p-3 shadow-sm border text-center", lightTheme.background.card, lightTheme.border.default, "dark:bg-gray-800 dark:border-gray-700")}>
                                        <p className={cn("text-xs mb-1", lightTheme.text.muted, "dark:text-gray-400")}>Assigned Shift</p>
                                        <p className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{employee.shift}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className={cn("border p-1 rounded-xl w-full justify-start h-12 overflow-x-auto", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-gray-900 dark:border-gray-800")}>
                    <TabsTrigger value="overview" className="rounded-lg px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-300">Overview</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-lg px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-300">Attendance Log</TabsTrigger>
                    <TabsTrigger value="leaves" className="rounded-lg px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-300">Leave Management</TabsTrigger>
                    <TabsTrigger value="biometrics" className="rounded-lg px-6 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900/50 dark:data-[state=active]:text-emerald-300">
                        <Camera className="w-3.5 h-3.5 mr-1.5" />
                        Biometrics
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="rounded-lg px-6 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 dark:data-[state=active]:bg-purple-900/50 dark:data-[state=active]:text-purple-300">
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Insights
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 focus:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* KPI Cards */}
                        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border shadow-sm")}>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className={cn("text-sm font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Punctuality Rate</p>
                                    <p className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>96.5%</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border shadow-sm")}>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className={cn("text-sm font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Avg. Daily Hours</p>
                                    <p className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>8.6h</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border shadow-sm")}>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className={cn("text-sm font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Overtime YTD</p>
                                    <p className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>24h</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Today's Live Status */}
                    {todayPresence && (
                        <Card className={cn("overflow-hidden border shadow-sm", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-blue-900/50")}>
                            <CardHeader className={cn("pb-3 border-b", lightTheme.background.secondary, "dark:bg-blue-950/20 dark:border-blue-800/30")}>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                        <Activity className="w-4 h-4" />
                                        Today's Real-time Presence
                                    </CardTitle>
                                    <Badge className="bg-green-500 text-white animate-pulse border-none">Active Session</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                                    <div className="md:col-span-3">
                                        <div className="relative flex items-center justify-between mb-8">
                                            <div className="absolute left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 -z-0"></div>

                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mb-2 shadow-lg ring-4 ring-white dark:ring-gray-900">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                                <span className={cn("text-[10px] font-bold uppercase", lightTheme.text.muted)}>Check In</span>
                                                <p className={cn("text-xs font-bold", lightTheme.text.primary, "dark:text-white")}>{todayPresence.checkInTime}</p>
                                            </div>

                                            <div className="relative z-10 flex flex-col items-center opacity-50">
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white mb-2 shadow-lg ring-4 ring-white dark:ring-gray-900", (todayPresence.status === 'Checked-In Only' && parseInt(todayPresence.duration || '0') > 12) ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-700')}>
                                                    <AlertTriangle className="w-4 h-4" />
                                                </div>
                                                <span className={cn("text-[10px] font-bold uppercase", lightTheme.text.muted)}>Checkout</span>
                                                <span className={cn("text-[10px]", lightTheme.text.secondary)}>Pending</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-4 border-t border-gray-50 dark:border-gray-800">
                                            <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-border/50">
                                                <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", lightTheme.text.muted, "dark:text-slate-500")}>Entry Camera</p>
                                                <p className={cn("font-bold truncate", lightTheme.text.primary, "dark:text-white")}>{todayPresence.entryCamera}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-border/50">
                                                <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", lightTheme.text.muted, "dark:text-slate-500")}>Duration</p>
                                                <p className="font-bold text-blue-600 dark:text-blue-400">{todayPresence.duration}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-border/50">
                                                <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", lightTheme.text.muted, "dark:text-slate-500")}>Last Seen</p>
                                                <p className={cn("font-bold", lightTheme.text.primary, "dark:text-white")}>{todayPresence.lastSeenTime}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-border/50">
                                                <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", lightTheme.text.muted, "dark:text-slate-500")}>Expected End</p>
                                                <p className={cn("font-bold", lightTheme.text.primary, "dark:text-white")}>{todayPresence.shiftEndTime}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cn("p-4 rounded-xl border border-blue-100 dark:border-blue-900/50", lightTheme.background.secondary, "dark:bg-blue-950/20")}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <MapPin className="w-4 h-4 text-orange-500" />
                                            <span className={cn("text-xs font-bold", lightTheme.text.primary, "dark:text-white")}>Current Location</span>
                                        </div>
                                        <p className={cn("text-sm font-bold mb-1", lightTheme.text.primary, "dark:text-white")}>{todayPresence.area || todayPresence.location}</p>
                                        <p className={cn("text-xs mb-3", lightTheme.text.muted, "dark:text-gray-400")}>{todayPresence.lastSeenCamera}</p>
                                        <Badge className="w-full justify-center py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-none font-bold text-xs">
                                            Live on {todayPresence.floor || 'Main Floor'}
                                        </Badge>
                                    </div>
                                </div>
                                {(todayPresence.status === 'Checked-In Only' && parseInt(todayPresence.duration || '0') > 12) && (
                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                        <p className="text-xs font-bold text-red-700 dark:text-red-400">
                                            CRITICAL: Missing checkout detected ({todayPresence.duration}).
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border shadow-sm")}>
                            <CardHeader>
                                <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {employeeAttendance.length > 0 ? (
                                        employeeAttendance.slice(0, 4).map((record: AttendanceRecord, i: number) => (
                                            <div key={i} className="flex items-start gap-4">
                                                <div className={`w-2 h-2 mt-2 rounded-full ${record.status === 'present' ? 'bg-green-500' : record.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                                <div>
                                                    <p className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{record.date.toLocaleDateString()}</p>
                                                    <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>
                                                        Check In: {record.checkIn ? record.checkIn.toLocaleTimeString() : '-'} | Check Out: {record.checkOut ? record.checkOut.toLocaleTimeString() : 'Active'}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className={cn("ml-auto", lightTheme.border.default)}>{record.status}</Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <p className={cn("text-sm py-4", lightTheme.text.muted)}>No recent attendance records found.</p>
                                    )}
                                </div>
                                <Button variant="link" className="w-full mt-4 text-blue-600 dark:text-blue-400" onClick={() => setActiveTab('attendance')}>
                                    View Full Log
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border shadow-sm")}>
                            <CardHeader>
                                <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Weekly Hours Trend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklyHoursData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={lightTheme.border.default.replace('border-', '') === 'gray-100' ? '#f3f4f6' : '#e5e7eb'} className="dark:stroke-gray-800" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="attendance" className="focus:outline-none">
                    <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                        <CardHeader>
                            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Complete Attendance Log</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {employeeAttendance.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className={cn("text-xs uppercase", lightTheme.text.muted, lightTheme.background.secondary, "dark:bg-gray-800/50")}>
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Date</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Check In</th>
                                                <th className="px-4 py-3">Check Out</th>
                                                <th className="px-4 py-3">Work Hours</th>
                                                <th className="px-4 py-3 rounded-r-lg">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employeeAttendance.map((record: AttendanceRecord) => (
                                                <tr key={record.id} className={cn("border-b last:border-0", lightTheme.border.default, "dark:border-gray-800")}>
                                                    <td className={cn("px-4 py-3 font-medium", lightTheme.text.primary, "dark:text-white")}>{record.date.toLocaleDateString()}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge className={record.status === 'present' ? cn(lightTheme.status.successBg, lightTheme.status.success) : cn(lightTheme.status.warningBg, lightTheme.status.warning)}>
                                                            {record.status}
                                                        </Badge>
                                                    </td>
                                                    <td className={cn("px-4 py-3", lightTheme.text.secondary, "dark:text-gray-300")}>{record.checkIn ? record.checkIn.toLocaleTimeString() : '-'}</td>
                                                    <td className={cn("px-4 py-3", lightTheme.text.secondary, "dark:text-gray-300")}>{record.checkOut ? record.checkOut.toLocaleTimeString() : '-'}</td>
                                                    <td className={cn("px-4 py-3", lightTheme.text.secondary, "dark:text-gray-300")}>{record.workingHours}h</td>
                                                    <td className={cn("px-4 py-3", lightTheme.text.secondary, "dark:text-gray-300")}>{record.location}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className={cn("text-gray-500", lightTheme.text.muted)}>No attendance records found for this employee.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="leaves" className="focus:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <Card className={cn(lightTheme.background.info, "border-blue-100 dark:border-blue-900")}>
                            <CardContent className="p-6 text-center">
                                <p className={cn("text-sm font-medium mb-1", lightTheme.status.info)}>Vacation Balance</p>
                                <p className={cn("text-4xl font-bold", lightTheme.text.primary, "dark:text-blue-300")}>12<span className={cn("text-lg font-normal", lightTheme.text.muted)}> / 20</span> </p>
                                <p className={cn("text-xs mt-2", lightTheme.text.muted)}>Days Remaining</p>
                            </CardContent>
                        </Card>
                        <Card className={cn(lightTheme.background.success, "border-emerald-100 dark:border-emerald-900")}>
                            <CardContent className="p-6 text-center">
                                <p className={cn("text-sm font-medium mb-1", lightTheme.status.success)}>Sick Leave</p>
                                <p className={cn("text-4xl font-bold", lightTheme.text.primary, "dark:text-emerald-300")}>8<span className={cn("text-lg font-normal", lightTheme.text.muted)}> / 10</span> </p>
                                <p className={cn("text-xs mt-2", lightTheme.text.muted)}>Days Remaining</p>
                            </CardContent>
                        </Card>
                        <Card className={cn(lightTheme.background.warning, "border-purple-100 dark:border-purple-900")}>
                            <CardContent className="p-6 text-center">
                                <p className={cn("text-sm font-medium mb-1", lightTheme.status.warning)}>Total Taken YTD</p>
                                <p className={cn("text-4xl font-bold", lightTheme.text.primary, "dark:text-purple-300")}>10</p>
                                <p className={cn("text-xs mt-2", lightTheme.text.muted)}>Days Used</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border shadow-sm")}>
                        <CardHeader>
                            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Recent Leave Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {employeeLeaves.length > 0 ? (
                                <div className="space-y-4">
                                    {employeeLeaves.map((leave: LeaveRequest, i: number) => (
                                        <div key={i} className={cn("flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-gray-800/50 dark:border-gray-800")}>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className={cn("font-semibold", lightTheme.text.primary, "dark:text-white")}>{leave.leaveType}</span>
                                                    <Badge className={leave.status === 'Approved' ? cn(lightTheme.status.successBg, lightTheme.status.success) : leave.status === 'Pending' ? cn(lightTheme.status.warningBg, lightTheme.status.warning) : cn(lightTheme.status.errorBg, lightTheme.status.error)}>
                                                        {leave.status}
                                                    </Badge>
                                                </div>
                                                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>
                                                    {leave.startDate} to {leave.endDate} • {leave.days} Day(s)
                                                </p>
                                                <p className={cn("text-sm italic mt-1", lightTheme.text.muted)}>"{leave.reason}"</p>
                                            </div>
                                            <div className={cn("mt-4 md:mt-0 text-sm", lightTheme.text.muted)}>
                                                Applied: {leave.appliedDate}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className={cn("text-gray-500", lightTheme.text.muted)}>No leave requests found.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="biometrics" className="focus:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                                <CardHeader>
                                    <CardTitle className="text-base">Face Enrollment</CardTitle>
                                    <p className={cn("text-xs", lightTheme.text.muted)}>Register face biometric for camera attendance</p>
                                </CardHeader>
                                <CardContent>
                                    <FaceEnrollButton
                                        employeeId={String(employee.id)}
                                        employeeName={employee.name}
                                        enrolled={employee.faceEnrolled}
                                        onEnrolled={() => { }}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
                                <CardHeader>
                                    <CardTitle className="text-base">Photo Requirements</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ul className="space-y-2 text-sm">
                                        {[
                                            'Front-facing, eyes visible',
                                            'Good, even lighting - no harsh shadows',
                                            'Neutral expression preferred',
                                            'No sunglasses or face coverings',
                                            'Single person only - no group photos',
                                            'Minimum 200x200 pixels, clear and in focus',
                                        ].map((req) => (
                                            <li key={req} className="flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                                <span className={cn(lightTheme.text.secondary, "dark:text-gray-300")}>{req}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-900/40 dark:text-amber-300 text-xs">
                                        Re-enrollment is required if the employee changes appearance significantly (e.g. grows/removes beard, new glasses).
                                        Poor quality photos will reduce recognition accuracy and may cause missed clock-ins.
                                    </div>

                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/40 dark:text-blue-300 text-xs">
                                        The face photo is processed by the on-device Jetson AI and only the mathematical embedding (not the photo itself) is stored in the database.
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="insights" className="focus:outline-none">
                    <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/10 dark:to-gray-900">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-purple-600" />
                                <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>AI Behavioral Insights</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className={cn("p-5 rounded-xl border shadow-sm", lightTheme.background.card, "border-purple-100 dark:bg-gray-800 dark:border-purple-800")}>
                                        <h4 className={cn("font-semibold flex items-center gap-2 mb-2", lightTheme.text.primary, "dark:text-white")}>
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            Productivity Pattern
                                        </h4>
                                        <p className={cn("text-sm leading-relaxed", lightTheme.text.secondary, "dark:text-gray-300")}>
                                            {employee.name} shows highest engagement during morning shifts (9 AM - 12 PM). Attendance regularity is strictly maintained with an average arrival variance of &lt; 5 minutes over the last 30 days.
                                        </p>
                                    </div>

                                    <div className={cn("p-5 rounded-xl border shadow-sm", lightTheme.background.card, "border-orange-100 dark:bg-gray-800 dark:border-orange-900")}>
                                        <h4 className={cn("font-semibold flex items-center gap-2 mb-2", lightTheme.text.primary, "dark:text-white")}>
                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                            Fatigue Risk Indicator
                                        </h4>
                                        <p className={cn("text-sm leading-relaxed", lightTheme.text.secondary, "dark:text-gray-300")}>
                                            Logged 24 hours of overtime in the past month. AI suggests a high probability of burnout risk if current trajectory continues. Recommendation: Mandate a consecutive 3-day rest period.
                                        </p>
                                    </div>
                                </div>

                                <div className={cn("p-6 rounded-xl border shadow-sm", lightTheme.background.card, "border-gray-100 dark:bg-gray-800 dark:border-gray-800")}>
                                    <h4 className={cn("font-semibold mb-4", lightTheme.text.primary, "dark:text-white")}>Spatial Movement Pattern</h4>
                                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-700 before:to-transparent">

                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-900 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div className={cn("w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-gray-800/50 dark:border-gray-800")}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={cn("font-bold text-sm", lightTheme.text.primary, "dark:text-white")}>Zone 1: Desk Area</span>
                                                </div>
                                                <div className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-400")}>Primary location (65% of day)</div>
                                            </div>
                                        </div>

                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-900 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div className={cn("w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-gray-800/50 dark:border-gray-800")}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={cn("font-bold text-sm", lightTheme.text.primary, "dark:text-white")}>Meeting Room B</span>
                                                </div>
                                                <div className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-400")}>Collaborative hub (20% of day)</div>
                                            </div>
                                        </div>

                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-900 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div className={cn("w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-gray-800/50 dark:border-gray-800")}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={cn("font-bold text-sm", lightTheme.text.primary, "dark:text-white")}>Cafeteria</span>
                                                </div>
                                                <div className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-400")}>Breaks & Social (15% of day)</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

