import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Device } from '../../types';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import { MetricCard } from '../shared/MetricCard';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AccuracyLogsProps {
  devices: Device[];
}

export const AccuracyLogs: React.FC<AccuracyLogsProps> = ({ devices }) => {
  // Filter devices that actually have accuracy data to avoid crashes
  const accuracyDevices = devices.filter(d => typeof d.recognitionAccuracy === 'number');

  // Generate mock accuracy history
  const accuracyHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ...accuracyDevices.reduce((acc, device) => ({
      ...acc,
      [device.name]: (device.recognitionAccuracy ?? 93) - 7 + Math.random() * 7, // mock fluctuation based on set baseline
    }), {}),
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const avgAccuracy = accuracyDevices.length > 0
    ? accuracyDevices.reduce((sum, d) => sum + (d.recognitionAccuracy || 0), 0) / accuracyDevices.length
    : 0;

  const minAccuracy = accuracyDevices.length > 0
    ? Math.min(...accuracyDevices.map(d => d.recognitionAccuracy || 0))
    : 0;

  const maxAccuracy = accuracyDevices.length > 0
    ? Math.max(...accuracyDevices.map(d => d.recognitionAccuracy || 0))
    : 0;

  if (accuracyDevices.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No devices with accuracy telemetry available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Accuracy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="System Average Accuracy"
          value={`${avgAccuracy.toFixed(2)}%`}
          icon={Target}
          description={avgAccuracy >= 95 ? "Optimal performance" : "Needs improvement"}
          colorClass="text-blue-500"
        />

        <MetricCard
          title="Best Performance"
          value={`${maxAccuracy.toFixed(2)}%`}
          icon={TrendingUp}
          description={accuracyDevices.find(d => d.recognitionAccuracy === maxAccuracy)?.name || 'Unknown'}
          colorClass="text-green-500"
        />

        <MetricCard
          title="Needs Attention"
          value={`${minAccuracy.toFixed(2)}%`}
          icon={AlertTriangle}
          description={accuracyDevices.find(d => d.recognitionAccuracy === minAccuracy)?.name || 'Unknown'}
          colorClass="text-orange-500"
        />
      </div>

      {/* Accuracy Trends */}
      <Card className={cn(lightTheme.background.card, "dark:bg-transparent")}>
        <CardHeader>
          <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Recognition Accuracy Trends (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={accuracyHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[85, 100]} />
              <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
              <Legend />
              {accuracyDevices.map((device, index) => (
                <Line
                  key={device.id}
                  type="monotone"
                  dataKey={device.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Device Performance Details */}
      <Card className={cn(lightTheme.background.card, "dark:bg-transparent")}>
        <CardHeader>
          <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Device Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {accuracyDevices.map((device, index) => (
              <div key={device.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <p className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{device.name}</p>
                        <p className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-500")}>{device.location || 'Unknown location'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn("text-sm font-medium", lightTheme.text.primary, "dark:text-white")}>
                        {(device.recognitionAccuracy || 0).toFixed(2)}%
                      </p>
                      <p className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-500")}>
                        {(device.totalScans || 0).toLocaleString()} scans
                      </p>
                    </div>
                    <Badge className={
                      (device.recognitionAccuracy || 0) >= 95 ? 'bg-green-100 text-green-800' :
                        (device.recognitionAccuracy || 0) >= 90 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                    }>
                      {(device.recognitionAccuracy || 0) >= 95 ? 'Excellent' :
                        (device.recognitionAccuracy || 0) >= 90 ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                </div>
                <Progress value={device.recognitionAccuracy || 0} className="h-2" />
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>Error Rate:</span>
                    <span className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{(device.errorRate || 0).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>Success Rate:</span>
                    <span className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{(100 - (device.errorRate || 0)).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>Total Scans:</span>
                    <span className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{(device.totalScans || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      <Card className={cn(lightTheme.background.card, "dark:bg-transparent")}>
        <CardHeader>
          <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Device Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={accuracyDevices.map(d => ({
              name: d.name.split(' - ')[0],
              accuracy: d.recognitionAccuracy || 0,
              errorRate: d.errorRate || 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="accuracy" fill="#10b981" name="Accuracy %" />
              <Bar dataKey="errorRate" fill="#ef4444" name="Error Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
