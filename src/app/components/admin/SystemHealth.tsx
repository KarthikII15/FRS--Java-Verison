import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, Device } from '../../types';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import { MetricCard } from '../shared/MetricCard';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface SystemHealthProps {
  devices: Device[];
  alerts: Alert[];
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ devices, alerts }) => {
  const onlineDevices = devices.filter(d => d.status === 'Online').length;
  const totalDevices = devices.length;
  const systemUptime = totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(1) : "0.0";
  const avgAccuracy = devices.length > 0 ? (devices.reduce((sum, d) => sum + (d.recognitionAccuracy || 0), 0) / devices.length).toFixed(1) : "0.0";
  const totalScans = devices.reduce((sum, d) => sum + (d.totalScans || 0), 0);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  // Generate mock uptime data
  const uptimeData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    uptime: 95 + Math.random() * 5,
  }));

  // Generate mock accuracy trends
  const accuracyTrends = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    accuracy: 93 + Math.random() * 7,
  }));

  const statusData = [
    { name: 'Online', value: devices.filter(d => d.status === 'Online').length, color: '#10b981' },
    { name: 'Offline', value: devices.filter(d => d.status === 'Offline').length, color: '#6b7280' },
    { name: 'Warning', value: devices.filter(d => d.status === 'Warning').length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="System Uptime"
          value={`${systemUptime}%`}
          icon={Activity}
          trend={{ value: 2.3, isPositive: true }}
          description="from yesterday"
          colorClass="text-blue-500"
        />

        <MetricCard
          title="Avg Accuracy"
          value={`${avgAccuracy}%`}
          icon={Zap}
          description="Within target range"
          colorClass="text-green-500"
        />

        <MetricCard
          title="Total Scans Today"
          value={totalScans.toLocaleString()}
          icon={Activity}
          trend={{ value: 156, isPositive: true }}
          description="from yesterday"
          colorClass="text-purple-500"
        />

        <MetricCard
          title="Critical Alerts"
          value={criticalAlerts}
          icon={AlertTriangle}
          description={criticalAlerts > 0 ? 'Requires attention' : 'All clear'}
          colorClass="text-red-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={cn(lightTheme.background.card, "dark:bg-transparent")}>
          <CardHeader>
            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>System Uptime (Last 24 Hours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={uptimeData}>
                <defs>
                  <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis domain={[90, 100]} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorUptime)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={cn(lightTheme.background.card, "dark:bg-transparent")}>
          <CardHeader>
            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Recognition Accuracy Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={accuracyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[90, 100]} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Device Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className={cn(lightTheme.background.card, "dark:bg-transparent")}>
          <CardHeader>
            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Device Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={cn("lg:col-span-2", lightTheme.background.card, "dark:bg-transparent")}>
          <CardHeader>
            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={cn("flex items-start gap-3 p-3 border rounded-lg transition-colors", lightTheme.border.default, "hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:border-gray-700")}
                >
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'critical' ? 'text-red-600' :
                    alert.severity === 'high' ? 'text-orange-600' :
                      alert.severity === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn("font-medium text-sm", lightTheme.text.primary, "dark:text-white")}>{alert.title}</p>
                      <Badge variant="outline" className={
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-400")}>{alert.message}</p>
                    <p className={cn("text-xs mt-1", lightTheme.text.muted, "dark:text-gray-500")}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
