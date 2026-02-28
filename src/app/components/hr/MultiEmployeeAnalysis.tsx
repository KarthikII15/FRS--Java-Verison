import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Employee, AttendanceRecord } from '../../types';
import { Users, TrendingUp, Clock, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

interface MultiEmployeeAnalysisProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  selectedEmployees: string[];
  onEmployeesChange: (ids: string[]) => void;
}

export const MultiEmployeeAnalysis: React.FC<MultiEmployeeAnalysisProps> = ({
  employees,
  attendanceRecords,
  selectedEmployees,
  onEmployeesChange,
}) => {
  const [showEmployeeList, setShowEmployeeList] = useState(true);

  const handleEmployeeToggle = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      onEmployeesChange(selectedEmployees.filter(id => id !== employeeId));
    } else {
      onEmployeesChange([...selectedEmployees, employeeId]);
    }
  };

  const selectAll = () => {
    onEmployeesChange(employees.map(e => e.id));
  };

  const clearAll = () => {
    onEmployeesChange([]);
  };

  const comparisonData = useMemo(() => {
    if (selectedEmployees.length === 0) return null;

    return selectedEmployees.map(empId => {
      const employee = employees.find(e => e.id === empId);
      if (!employee) return null;

      const empRecords = attendanceRecords.filter(r => r.employeeId === empId);
      const presentCount = empRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const lateCount = empRecords.filter(r => r.status === 'late').length;
      const avgWorkingHours = empRecords.length > 0
        ? empRecords.reduce((sum, r) => sum + r.workingHours, 0) / empRecords.length
        : 0;
      const totalOvertime = empRecords.reduce((sum, r) => sum + r.overtime, 0);
      const attendanceRate = empRecords.length > 0 ? (presentCount / empRecords.length) * 100 : 0;
      const punctualityRate = empRecords.length > 0 ? ((presentCount - lateCount) / empRecords.length) * 100 : 0;

      return {
        name: employee.name,
        department: employee.department,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        punctualityRate: Math.round(punctualityRate * 10) / 10,
        avgWorkingHours: Math.round(avgWorkingHours * 100) / 100,
        totalOvertime: Math.round(totalOvertime * 10) / 10,
        presentDays: presentCount,
        lateDays: lateCount,
      };
    }).filter(Boolean);
  }, [selectedEmployees, employees, attendanceRecords]);

  const radarData = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return [];

    const metrics = ['Attendance', 'Punctuality', 'Working Hours', 'Consistency'];

    return metrics.map(metric => {
      const dataPoint: any = { metric };

      comparisonData.forEach(emp => {
        if (metric === 'Attendance') {
          dataPoint[emp!.name] = emp!.attendanceRate;
        } else if (metric === 'Punctuality') {
          dataPoint[emp!.name] = emp!.punctualityRate;
        } else if (metric === 'Working Hours') {
          dataPoint[emp!.name] = (emp!.avgWorkingHours / 10) * 100;
        } else if (metric === 'Consistency') {
          dataPoint[emp!.name] = 100 - ((emp!.lateDays / emp!.presentDays) * 100);
        }
      });

      return dataPoint;
    });
  }, [comparisonData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Multi-Employee Analysis</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEmployeeList(!showEmployeeList)}>
                {showEmployeeList ? 'Hide' : 'Show'} Employee List
              </Button>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn("flex items-center gap-2 mb-4", lightTheme.text.primary, "dark:text-white")}>
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium">
              {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          {showEmployeeList && (
            <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg", lightTheme.background.secondary, "dark:bg-gray-800/50")}>
              {employees.map(employee => (
                <div key={employee.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`emp-${employee.id}`}
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={() => handleEmployeeToggle(employee.id)}
                  />
                  <label
                    htmlFor={`emp-${employee.id}`}
                    className={cn("text-sm font-medium leading-none cursor-pointer", lightTheme.text.primary, "dark:text-white")}
                  >
                    {employee.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEmployees.length === 0 ? (
        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className={cn("text-lg font-semibold mb-2", lightTheme.text.primary, "dark:text-gray-100")}>
              No Employees Selected
            </h3>
            <p className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>
              Select employees from the list above to view comparative analysis
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisonData && comparisonData.map((emp, index) => (
              <Card key={index} className={cn("border-l-4", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")} style={{ borderLeftColor: COLORS[index % COLORS.length] }}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <p className={cn("font-semibold text-lg", lightTheme.text.primary, "dark:text-white")}>{emp!.name}</p>
                      <p className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-500")}>{emp!.department}</p>
                    </div>
                    <div className={cn("space-y-2 text-sm", lightTheme.text.primary, "dark:text-white")}>
                      <div className="flex justify-between">
                        <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>Attendance:</span>
                        <span className="font-medium">{emp!.attendanceRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>Punctuality:</span>
                        <span className="font-medium">{emp!.punctualityRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>Avg Hours:</span>
                        <span className="font-medium">{emp!.avgWorkingHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>Overtime:</span>
                        <span className="font-medium">{emp!.totalOvertime}h</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
              <CardHeader>
                <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Attendance Rate Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="attendanceRate" fill="#3b82f6" name="Attendance Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
              <CardHeader>
                <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Working Hours Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgWorkingHours" fill="#10b981" name="Avg Working Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Radar Chart */}
          <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
            <CardHeader>
              <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Performance Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  {comparisonData && comparisonData.map((emp, index) => (
                    <Radar
                      key={emp!.name}
                      name={emp!.name}
                      dataKey={emp!.name}
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.3}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Side-by-Side Metrics */}
          <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
            <CardHeader>
              <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Detailed Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={cn("border-b", lightTheme.border.default, "dark:border-border")}>
                      <th className={cn("text-left p-3 font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Employee</th>
                      <th className={cn("text-left p-3 font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Department</th>
                      <th className={cn("text-right p-3 font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Attendance</th>
                      <th className={cn("text-right p-3 font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Punctuality</th>
                      <th className={cn("text-right p-3 font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Avg Hours</th>
                      <th className={cn("text-right p-3 font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Overtime</th>
                      <th className={cn("text-right p-3 font-medium", lightTheme.text.secondary, "dark:text-gray-400")}>Late Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData && comparisonData.map((emp, index) => (
                      <tr key={index} className={cn("border-b hover:bg-gray-50 dark:hover:bg-slate-800/50", lightTheme.border.default, "dark:border-border")}>
                        <td className={cn("p-3", lightTheme.text.primary, "dark:text-white")}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {emp!.name}
                          </div>
                        </td>
                        <td className={cn("p-3", lightTheme.text.secondary, "dark:text-gray-300")}>{emp!.department}</td>
                        <td className={cn("text-right p-3", lightTheme.text.primary, "dark:text-white")}>
                          <Badge variant="outline">{emp!.attendanceRate}%</Badge>
                        </td>
                        <td className={cn("text-right p-3", lightTheme.text.primary, "dark:text-white")}>
                          <Badge variant="outline">{emp!.punctualityRate}%</Badge>
                        </td>
                        <td className={cn("text-right p-3", lightTheme.text.primary, "dark:text-white")}>{emp!.avgWorkingHours}h</td>
                        <td className={cn("text-right p-3", lightTheme.text.primary, "dark:text-white")}>{emp!.totalOvertime}h</td>
                        <td className={cn("text-right p-3", lightTheme.text.primary, "dark:text-white")}>{emp!.lateDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

