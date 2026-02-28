import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './shared/Sidebar';
import { MobileNav } from './shared/MobileNav';
import { MetricCard } from './shared/MetricCard';
import {
  Users,
  Monitor,
  Activity,
  FileText,
  Settings,
  Database,
  AlertCircle,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { mockAuditLogs, mockEmployees, mockUsers } from '../utils/mockData';
import { mockDevices, mockAlerts } from '../data/enhancedMockData';
import { UserManagement } from './admin/UserManagement';
import { SystemHealth } from './admin/SystemHealth';
import { OperationsConsole } from './admin/OperationsConsole';
import { AuditLogs } from './admin/AuditLogs';
import { AccuracyLogs } from './admin/AccuracyLogs';
import { LiveOfficeIntelligence } from './hr/LiveOfficeIntelligence';
import { Map, Activity as ActivityIcon } from 'lucide-react';
import { lightTheme } from '../../theme/lightTheme';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const navigationItems = [
    { label: 'Overview', icon: Activity, value: 'overview', permission: 'devices.read' as const },
    { label: 'Users', icon: Users, value: 'users', permission: 'users.read' as const },
    { label: 'Operations Console', icon: Building2, value: 'operations', permission: 'facility.manage' as const },
    { label: 'Live Office Intelligence', icon: ActivityIcon, value: 'presence-monitor', permission: 'attendance.read' as const },
    { label: 'Accuracy', icon: Database, value: 'accuracy', permission: 'devices.read' as const },
    { label: 'Audit Logs', icon: FileText, value: 'audit', permission: 'audit.read' as const },
  ];
  const visibleNavigationItems = useMemo(
    () => navigationItems.filter((item) => !item.permission || can(item.permission)),
    [can]
  );

  useEffect(() => {
    if (!visibleNavigationItems.some((item) => item.value === activeTab)) {
      setActiveTab(visibleNavigationItems[0]?.value ?? 'overview');
    }
  }, [activeTab, visibleNavigationItems]);

  const onlineDevices = mockDevices.filter(d => d.status === 'Online').length;
  const offlineDevices = mockDevices.filter(d => d.status === 'Offline').length;
  const errorDevices = mockDevices.filter(d => d.status === 'Warning').length;
  const criticalAlerts = (mockAlerts as any[]).filter(a => a.severity === 'Critical' || a.severity === 'high').length;
  const avgAccuracy = mockDevices.reduce((sum, d) => sum + (d.recognitionAccuracy || 0), 0) / (mockDevices.length || 1);

  const unreadAlerts = (mockAlerts as any[]).filter(a => !a.read).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <SystemHealth devices={mockDevices} alerts={mockAlerts} />;
      case 'users':
        return <UserManagement users={mockUsers} employees={mockEmployees} />;
      case 'operations':
        return <OperationsConsole />;
      case 'presence-monitor':
        return <LiveOfficeIntelligence role="admin" />;
      case 'accuracy':
        return <AccuracyLogs devices={mockDevices} />;
      case 'audit':
        return <AuditLogs logs={mockAuditLogs} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen", lightTheme.background.primary, "dark:bg-background")}>
      <Sidebar
        title="System Administration"
        unreadAlerts={unreadAlerts}
        navigationItems={navigationItems}
        activeTab={activeTab}
        onNavigate={setActiveTab}
      />

      <MobileNav
        title="System Administration"
        unreadAlerts={unreadAlerts}
        navigationItems={navigationItems}
        activeTab={activeTab}
        onNavigate={setActiveTab}
      />

      <main className="md:ml-64 p-4 md:p-6 mt-16 md:mt-0">
        <div className="max-w-[1600px] mx-auto">
          {/* Page Title */}
          <div className="mb-6">
            <h2 className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>
              {navigationItems.find(item => item.value === activeTab)?.label || 'Overview'}
            </h2>
            <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
              Facial recognition system monitoring & management
            </p>
          </div>

          {/* Key Metrics */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <MetricCard
                title="Total Users"
                value={mockUsers.length}
                icon={Users}
                description={`${mockEmployees.length} employees registered`}
                colorClass="text-blue-500"
              />
              <MetricCard
                title="Active Devices"
                value={`${onlineDevices}/${mockDevices.length}`}
                icon={Monitor}
                trend={{ value: offlineDevices > 0 ? -5 : 2, isPositive: offlineDevices === 0 }}
                colorClass="text-emerald-500"
              />
              <MetricCard
                title="System Health"
                value={errorDevices === 0 ? 'Excellent' : 'Needs Attention'}
                icon={ShieldCheck}
                description={`${avgAccuracy.toFixed(1)}% avg accuracy`}
                colorClass={errorDevices === 0 ? 'text-emerald-500' : 'text-amber-500'}
              />
              <MetricCard
                title="Critical Alerts"
                value={criticalAlerts}
                icon={AlertCircle}
                colorClass={criticalAlerts > 0 ? 'text-rose-500' : 'text-emerald-500'}
              />
            </div>
          )}


          {/* Main Content */}
          <div className="space-y-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

