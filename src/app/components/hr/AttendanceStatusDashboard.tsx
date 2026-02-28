import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  UserCheck,
  UserX,
  Clock,
  Briefcase,
  AlertCircle,
  TrendingUp,
  Calendar,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockEmployees, mockLivePresence } from '../../data/enhancedMockData';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

type AttendanceStatus = 'Present' | 'Absent' | 'On Leave' | 'Checked-In Only' | 'Late' | 'Overtime';

interface StatusEmployee {
  id: string;
  name: string;
  department: string;
  status: AttendanceStatus;
  checkInTime?: string;
  duration?: string;
}

export const AttendanceStatusDashboard: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<AttendanceStatus | 'all'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast.success("Report Exported", { description: "The attendance status report has been successfully downloaded." });
    }, 1500);
  };

  // Mock data with enhanced statuses
  const mockStatusEmployees: StatusEmployee[] = [
    ...mockLivePresence.map(p => ({
      id: p.employeeId,
      name: p.employeeName,
      department: p.department,
      status: p.status as AttendanceStatus,
      checkInTime: p.checkInTime,
      duration: p.duration,
    })),
    { id: 'emp-010', name: 'Anna Martinez', department: 'Finance', status: 'Absent' as AttendanceStatus },
    { id: 'emp-011', name: 'James Wilson', department: 'Engineering', status: 'On Leave' as AttendanceStatus },
  ];

  const getStatusCount = (status: AttendanceStatus) => {
    return mockStatusEmployees.filter(e => e.status === status).length;
  };

  const presentCount = getStatusCount('Present');
  const absentCount = getStatusCount('Absent');
  const onLeaveCount = getStatusCount('On Leave');
  const checkedInOnlyCount = getStatusCount('Checked-In Only');
  const lateCount = getStatusCount('Late');
  const overtimeCount = getStatusCount('Overtime');

  const filteredEmployees = activeFilter === 'all'
    ? mockStatusEmployees
    : mockStatusEmployees.filter(e => e.status === activeFilter);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'Absent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      case 'On Leave':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Checked-In Only':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Late':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300';
      case 'Overtime':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return <UserCheck className="w-5 h-5 text-green-600" />;
      case 'Absent':
        return <UserX className="w-5 h-5 text-red-600" />;
      case 'On Leave':
        return <Briefcase className="w-5 h-5 text-blue-600" />;
      case 'Checked-In Only':
      case 'Late':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Overtime':
        return <TrendingUp className="w-5 h-5 text-purple-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">


      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", activeFilter === 'Present' ? 'ring-2 ring-green-500' : '')}
          onClick={() => setActiveFilter(activeFilter === 'Present' ? 'all' : 'Present')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            <p className={cn("text-xs mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>Present</p>
          </CardContent>
        </Card>

        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", activeFilter === 'Absent' ? 'ring-2 ring-red-500' : '')}
          onClick={() => setActiveFilter(activeFilter === 'Absent' ? 'all' : 'Absent')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            <p className={cn("text-xs mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>Absent</p>
          </CardContent>
        </Card>

        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", activeFilter === 'On Leave' ? 'ring-2 ring-blue-500' : '')}
          onClick={() => setActiveFilter(activeFilter === 'On Leave' ? 'all' : 'On Leave')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{onLeaveCount}</p>
            <p className={cn("text-xs mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>On Leave</p>
          </CardContent>
        </Card>

        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", activeFilter === 'Checked-In Only' ? 'ring-2 ring-yellow-500' : '')}
          onClick={() => setActiveFilter(activeFilter === 'Checked-In Only' ? 'all' : 'Checked-In Only')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{checkedInOnlyCount}</p>
            <p className={cn("text-xs mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>No Check-Out</p>
          </CardContent>
        </Card>

        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", activeFilter === 'Late' ? 'ring-2 ring-orange-500' : '')}
          onClick={() => setActiveFilter(activeFilter === 'Late' ? 'all' : 'Late')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{lateCount}</p>
            <p className={cn("text-xs mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>Late Today</p>
          </CardContent>
        </Card>

        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", activeFilter === 'Overtime' ? 'ring-2 ring-purple-500' : '')}
          onClick={() => setActiveFilter(activeFilter === 'Overtime' ? 'all' : 'Overtime')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{overtimeCount}</p>
            <p className={cn("text-xs mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>Overtime</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>
              {activeFilter === 'all' ? 'All Employees' : `${activeFilter} Employees`}
            </CardTitle>
            {activeFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setActiveFilter('all')}>
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className={cn("flex items-center justify-between p-4 rounded-lg hover:shadow-md transition-shadow", lightTheme.background.secondary, "dark:bg-gray-800/50")}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {getStatusIcon(employee.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{employee.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {employee.department}
                      </Badge>
                    </div>
                    {employee.checkInTime && (
                      <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-300")}>
                        Check-in: {employee.checkInTime}
                        {employee.duration && ` • ${employee.duration}`}
                      </p>
                    )}
                  </div>
                </div>

                <Badge className={`${getStatusColor(employee.status)} text-xs font-medium px-3 py-1 flex-shrink-0 ml-2`}>
                  {employee.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

