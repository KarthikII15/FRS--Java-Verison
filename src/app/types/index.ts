export type UserRole = 'admin' | 'hr';

export type Permission =
  | 'users.read'
  | 'users.manage'
  | 'devices.read'
  | 'devices.manage'
  | 'attendance.read'
  | 'attendance.manage'
  | 'analytics.read'
  | 'audit.read'
  | 'facility.read'
  | 'facility.manage'
  | 'aiinsights.read';

export interface Tenant {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
}

export interface Site {
  id: string;
  customerId: string;
  name: string;
}

export interface Unit {
  id: string;
  siteId: string;
  name: string;
}

export interface AccessScope {
  tenantId: string;
  customerId?: string;
  siteId?: string;
  unitId?: string;
}

export interface UserMembership {
  id: string;
  userId: string;
  role: UserRole;
  permissions: Permission[];
  scope: AccessScope;
}

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  department?: string;
  createdAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  employeeId: string;
  shift: ShiftType;
  location: string;
  joinDate: Date;
  avatar?: string;
  status: EmployeeStatus;
}

export type ShiftType = 'morning' | 'evening' | 'night' | 'flexible';
export type EmployeeStatus = 'active' | 'inactive' | 'on-leave';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'on-leave' | 'on-break';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  status: AttendanceStatus;
  workingHours: number;
  breakDuration: number;
  overtime: number;
  isLate: boolean;
  isEarlyDeparture: boolean;
  deviceId?: string;
  location?: string;
  recognitionAccuracy?: number;
}

export interface Device {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'error' | 'Online' | 'Offline' | 'Warning';
  lastActive: Date | string;
  macAddress?: string;
  port?: number;
  serialNumber?: string;
  recognitionAccuracy: number;
  cpuHistory?: number[];
  totalScans?: number;
  errorRate?: number;
  model?: string;
  ipAddress: string;
  type?: 'Camera' | 'Edge Device';
  deviceRole?: string;
  uptime?: number;
  eventsToday?: number;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'Critical' | 'Warning' | 'Info';
  title?: string;
  message: string;
  employeeId?: string;
  deviceId?: string;
  timestamp: Date | string;
  read?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
  ipAddress: string;
}

export interface DashboardMetrics {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  onBreak: number;
  onLeave: number;
  avgWorkingHours: number;
  totalOvertimeHours: number;
  attendanceRate: number;
  punctualityRate: number;
}

export interface AnalyticsData {
  attendanceTrends: TrendData[];
  workingHoursTrends: TrendData[];
  departmentComparison: ComparisonData[];
  hourlyActivity: HourlyData[];
  weeklyPattern: WeeklyData[];
  topPerformers: PerformerData[];
  bottomPerformers: PerformerData[];
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

export interface ComparisonData {
  name: string;
  value: number;
  percentage: number;
}

export interface HourlyData {
  hour: number;
  checkIns: number;
  checkOuts: number;
  active: number;
}

export interface WeeklyData {
  day: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
}

export interface PerformerData {
  employeeId: string;
  name: string;
  department: string;
  score: number;
  attendanceRate: number;
  avgWorkingHours: number;
  punctualityRate: number;
}

export interface AIInsight {
  id: string;
  type: 'anomaly' | 'prediction' | 'recommendation' | 'summary';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  data?: any;
  actions?: string[];
}

export interface FilterOptions {
  dateRange: { start: Date; end: Date };
  departments: string[];
  employees: string[];
  shifts: ShiftType[];
  locations: string[];
  status: AttendanceStatus[];
  timeInterval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}
