import React, { useState, useMemo } from 'react';
import { Sidebar } from './shared/Sidebar';
import { MobileNav } from './shared/MobileNav';
import { MetricCard } from './shared/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Download,
  Filter,
  BarChart3,
  Sparkles,
  UserPlus,
  Building2,
  Activity,
  Timer,
  Zap,
  Target,
  UserX,
  Map,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import { lightTheme } from '../../theme/lightTheme';

import { mockAIInsights } from '../utils/mockData';
import { calculateDashboardMetrics, generateAnalytics } from '../utils/analytics';
import { useLiveData } from '../hooks/useLiveData';
import { AttendanceTable } from './hr/AttendanceTable';
import { AnalyticsCharts } from './hr/AnalyticsCharts';
import { FilterPanel } from './hr/FilterPanel';
import { AIInsightsPanel } from './hr/AIInsightsPanel';
import { MultiEmployeeAnalysis } from './hr/MultiEmployeeAnalysis';
import { LiveOfficeIntelligence } from './hr/LiveOfficeIntelligence';
import { EmployeeLifecycleManagement } from './hr/EmployeeLifecycleManagement';
import { DepartmentShiftManagement } from './hr/DepartmentShiftManagement';
import { FacilityControlDashboard } from './hr/FacilityControlDashboard';
import { AttendanceStatusDashboard } from './hr/AttendanceStatusDashboard';
import { LeaveManagement } from './hr/LeaveManagement';
import { FilterOptions } from '../types';

export const HRDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    departments: [],
    employees: [],
    shifts: [],
    locations: [],
    status: [],
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const { employees, attendance, alerts, isLoading, error } = useLiveData();

  const navigationItems = [
    { label: 'Overview', icon: BarChart3, value: 'overview' },
    { label: 'Live Office Intelligence', icon: UserCheck, value: 'live-office' },
    { label: 'Attendance History', icon: Clock, value: 'attendance-history' },
    { label: 'Leave Management', icon: Calendar, value: 'leave-management' },
    { label: 'Employee Lifecycle', icon: UserPlus, value: 'employee-lifecycle' },
    { label: 'Departments & Shifts', icon: Building2, value: 'dept-shift' },
    { label: 'Analytics & Comparisons', icon: TrendingUp, value: 'analytics' },
    { label: 'AI Insights', icon: Sparkles, value: 'ai-insights' },
  ];

  // Calculate metrics based on filters
  const metrics = useMemo(() => {
    return calculateDashboardMetrics(employees, attendance, filters.dateRange);
  }, [filters, employees, attendance]);

  // Generate analytics data
  const analytics = useMemo(() => {
    return generateAnalytics(employees, attendance);
  }, [employees, attendance]);

  const unreadAlerts = alerts.filter(a => !a.read).length;

  const [isExporting, setIsExporting] = useState(false);

  const handleExportReport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast.success("HR Analytics Report Exported", { description: "The comprehensive analytics report has been downloaded." });
    }, 1500);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Employees"
                value={metrics.totalEmployees}
                icon={Users}
              />
              <MetricCard
                title="Present Today"
                value={metrics.presentToday}
                icon={UserCheck}
                trend={{ value: 5.2, isPositive: true }}
                colorClass="text-emerald-500"
              />
              <MetricCard
                title="Late Today"
                value={metrics.lateToday}
                icon={Clock}
                trend={{ value: 2.1, isPositive: false }}
                colorClass="text-amber-500"
              />
              <MetricCard
                title="Attendance Rate"
                value={`${metrics.attendanceRate}%`}
                icon={Activity}
                trend={{ value: 1.8, isPositive: true }}
                colorClass="text-violet-500"
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Avg Working Hours"
                value={`${metrics.avgWorkingHours}h`}
                icon={Timer}
                description="Per employee per day"
                colorClass="text-indigo-500"
              />
              <MetricCard
                title="Total Overtime"
                value={`${metrics.totalOvertimeHours}h`}
                icon={Zap}
                description="This period"
                colorClass="text-orange-500"
              />
              <MetricCard
                title="Punctuality Rate"
                value={`${metrics.punctualityRate}%`}
                icon={Target}
                trend={{ value: 3.5, isPositive: true }}
                colorClass="text-teal-500"
              />
              <MetricCard
                title="Absent Today"
                value={metrics.absentToday}
                icon={UserX}
                colorClass="text-rose-500"
              />
            </div>

            <AnalyticsCharts analytics={analytics} />
            <AttendanceTable
              employees={employees}
              attendanceRecords={attendance}
              filters={filters}
            />
          </div>
        );
      case 'live-office':
        return <LiveOfficeIntelligence role="hr" />;
      case 'attendance-history':
        return <AttendanceStatusDashboard />;
      case 'leave-management':
        return <LeaveManagement />;
      case 'employee-lifecycle':
        return <EmployeeLifecycleManagement />;
      case 'dept-shift':
        return <DepartmentShiftManagement />;
      case 'analytics':
        return (
          <AnalyticsCharts
            analytics={analytics}
            detailed
            employees={employees}
            attendanceRecords={attendance}
            selectedEmployees={selectedEmployees}
            onEmployeesChange={setSelectedEmployees}
          />
        );
      case 'ai-insights':
        return <AIInsightsPanel insights={mockAIInsights} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen", lightTheme.background.primary, "dark:bg-background")}>
      <Sidebar
        title="Workforce Analytics"
        unreadAlerts={unreadAlerts}
        navigationItems={navigationItems}
        activeTab={activeTab}
        onNavigate={setActiveTab}
      />

      <MobileNav
        title="Workforce Analytics"
        unreadAlerts={unreadAlerts}
        navigationItems={navigationItems}
        activeTab={activeTab}
        onNavigate={setActiveTab}
      />

      <main className="md:ml-64 p-4 md:p-6 mt-16 md:mt-0">
        <div className="max-w-[1600px] mx-auto">
          {/* Page Title & Actions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>
                  {navigationItems.find(item => item.value === activeTab)?.label || 'Overview'}
                </h2>
                <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
                  Showing data from {filters.dateRange.start.toLocaleDateString()} to{' '}
                  {filters.dateRange.end.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Button variant="outline" onClick={handleExportReport} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isExporting ? 'Generating...' : 'Export Report'}
                </Button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <FilterPanel filters={filters} onFiltersChange={setFilters} />
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 min-h-[500px]">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p className="text-lg">Loading enterprise analytics data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-rose-500 min-h-[500px]">
              <AlertTriangle className="h-10 w-10 mb-4" />
              <p className="text-lg font-medium">Failed to load live data</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {renderContent()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

