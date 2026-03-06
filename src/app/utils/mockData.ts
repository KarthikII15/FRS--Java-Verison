import {
  Employee,
  AttendanceRecord,
  Device,
  Alert,
  AuditLog,
  User,
  AIInsight
} from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-admin-1',
    email: 'admin@company.com',
    password: 'admin123',
    role: 'admin',
    name: 'Admin User',
    department: 'IT',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-hr-1',
    email: 'hr@company.com',
    password: 'hr123',
    role: 'hr',
    name: 'HR Manager',
    department: 'Human Resources',
    createdAt: new Date('2024-01-01'),
  },
];

// Mock Employees
export const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    department: 'Engineering',
    position: 'Senior Software Engineer',
    employeeId: 'EMP001',
    shift: 'morning',
    location: 'Building A',
    joinDate: new Date('2022-03-15'),
    status: 'active',
  },
  {
    id: 'emp-002',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    department: 'Engineering',
    position: 'DevOps Engineer',
    employeeId: 'EMP002',
    shift: 'morning',
    location: 'Building A',
    joinDate: new Date('2021-07-20'),
    status: 'active',
  },
  {
    id: 'emp-003',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    department: 'Marketing',
    position: 'Marketing Manager',
    employeeId: 'EMP003',
    shift: 'flexible',
    location: 'Building B',
    joinDate: new Date('2020-11-10'),
    status: 'active',
  },
  {
    id: 'emp-004',
    name: 'David Kim',
    email: 'david.kim@company.com',
    department: 'Sales',
    position: 'Sales Director',
    employeeId: 'EMP004',
    shift: 'morning',
    location: 'Building B',
    joinDate: new Date('2019-05-01'),
    status: 'active',
  },
  {
    id: 'emp-005',
    name: 'Jessica Williams',
    email: 'jessica.williams@company.com',
    department: 'Engineering',
    position: 'Frontend Developer',
    employeeId: 'EMP005',
    shift: 'morning',
    location: 'Building A',
    joinDate: new Date('2023-01-15'),
    status: 'active',
  },
  {
    id: 'emp-006',
    name: 'Robert Taylor',
    email: 'robert.taylor@company.com',
    department: 'Finance',
    position: 'Financial Analyst',
    employeeId: 'EMP006',
    shift: 'morning',
    location: 'Building C',
    joinDate: new Date('2021-09-20'),
    status: 'active',
  },
  {
    id: 'emp-007',
    name: 'Amanda Martinez',
    email: 'amanda.martinez@company.com',
    department: 'Marketing',
    position: 'Content Strategist',
    employeeId: 'EMP007',
    shift: 'flexible',
    location: 'Building B',
    joinDate: new Date('2022-06-01'),
    status: 'active',
  },
  {
    id: 'emp-008',
    name: 'James Anderson',
    email: 'james.anderson@company.com',
    department: 'Sales',
    position: 'Account Executive',
    employeeId: 'EMP008',
    shift: 'morning',
    location: 'Building B',
    joinDate: new Date('2023-02-14'),
    status: 'active',
  },
  {
    id: 'emp-009',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@company.com',
    department: 'Human Resources',
    position: 'HR Specialist',
    employeeId: 'EMP009',
    shift: 'morning',
    location: 'Building C',
    joinDate: new Date('2020-08-30'),
    status: 'active',
  },
  {
    id: 'emp-010',
    name: 'Christopher Lee',
    email: 'christopher.lee@company.com',
    department: 'Engineering',
    position: 'Backend Developer',
    employeeId: 'EMP010',
    shift: 'evening',
    location: 'Building A',
    joinDate: new Date('2022-11-05'),
    status: 'active',
  },
];

// Generate attendance records for the last 30 days
export const generateAttendanceRecords = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);

    mockEmployees.forEach((employee) => {
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) return;

      // Random absence (10% chance)
      if (Math.random() < 0.1) {
        records.push({
          id: `att-${employee.id}-${dayOffset}`,
          employeeId: employee.id,
          date,
          status: 'absent',
          workingHours: 0,
          breakDuration: 0,
          overtime: 0,
          isLate: false,
          isEarlyDeparture: false,
          recognitionAccuracy: 0,
        });
        return;
      }

      // Check-in time (9:00 AM base + random variance)
      const checkIn = new Date(date);
      const lateMinutes = Math.random() < 0.3 ? Math.floor(Math.random() * 45) : -Math.floor(Math.random() * 15);
      checkIn.setHours(9, lateMinutes, 0);

      // Check-out time (6:00 PM base + random variance)
      const checkOut = new Date(date);
      const overtimeMinutes = Math.random() < 0.4 ? Math.floor(Math.random() * 120) : 0;
      checkOut.setHours(18, overtimeMinutes, 0);

      // Break times
      const breakStart = new Date(date);
      breakStart.setHours(12, 30, 0);
      const breakEnd = new Date(date);
      breakEnd.setHours(13, Math.floor(Math.random() * 30) + 15, 0);

      const workingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) -
        (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
      const breakDuration = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
      const overtime = Math.max(0, workingHours - 8);
      const isLate = lateMinutes > 0;

      records.push({
        id: `att-${employee.id}-${dayOffset}`,
        employeeId: employee.id,
        date,
        checkIn,
        checkOut,
        breakStart,
        breakEnd,
        status: isLate ? 'late' : 'present',
        workingHours: Math.round(workingHours * 100) / 100,
        breakDuration: Math.round(breakDuration),
        overtime: Math.round(overtime * 100) / 100,
        isLate,
        isEarlyDeparture: false,
        deviceId: `device-${Math.floor(Math.random() * 5) + 1}`,
        location: employee.location,
        recognitionAccuracy: 90 + Math.random() * 10,
      });
    });
  }

  return records;
};

export const mockAttendanceRecords = generateAttendanceRecords();

// Mock Devices
export const mockDevices: Device[] = [
  {
    id: 'device-1',
    name: 'Main Entrance - Building A',
    location: 'Building A - Ground Floor',
    status: 'online',
    lastActive: new Date(),
    recognitionAccuracy: 98.5,
    totalScans: 15234,
    errorRate: 1.5,
    model: 'FaceVision Pro X1',
    ipAddress: '192.168.1.101',
  },
  {
    id: 'device-2',
    name: 'Main Entrance - Building B',
    location: 'Building B - Ground Floor',
    status: 'online',
    lastActive: new Date(),
    recognitionAccuracy: 97.8,
    totalScans: 12456,
    errorRate: 2.2,
    model: 'FaceVision Pro X1',
    ipAddress: '192.168.1.102',
  },
  {
    id: 'device-3',
    name: 'Main Entrance - Building C',
    location: 'Building C - Ground Floor',
    status: 'online',
    lastActive: new Date(),
    recognitionAccuracy: 96.5,
    totalScans: 8932,
    errorRate: 3.5,
    model: 'FaceVision Standard',
    ipAddress: '192.168.1.103',
  },
  {
    id: 'device-4',
    name: 'Cafeteria Entrance',
    location: 'Building A - 2nd Floor',
    status: 'offline',
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
    recognitionAccuracy: 95.2,
    totalScans: 6745,
    errorRate: 4.8,
    model: 'FaceVision Lite',
    ipAddress: '192.168.1.104',
  },
  {
    id: 'device-5',
    name: 'Parking Gate',
    location: 'Parking Lot B',
    status: 'error',
    lastActive: new Date(Date.now() - 30 * 60 * 1000),
    recognitionAccuracy: 92.1,
    totalScans: 4523,
    errorRate: 7.9,
    model: 'FaceVision Outdoor',
    ipAddress: '192.168.1.105',
  },
];

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'device-offline',
    severity: 'high',
    title: 'Device Offline',
    message: 'Cafeteria Entrance device has been offline for 2 hours',
    deviceId: 'device-4',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
  },
  {
    id: 'alert-2',
    type: 'recognition-failure',
    severity: 'medium',
    title: 'High Error Rate Detected',
    message: 'Parking Gate device showing 7.9% error rate',
    deviceId: 'device-5',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: false,
  },
  {
    id: 'alert-3',
    type: 'consecutive-absence',
    severity: 'medium',
    title: 'Consecutive Absence Alert',
    message: 'Employee EMP007 has been absent for 2 consecutive days',
    employeeId: 'emp-007',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: 'alert-4',
    type: 'late-checkin',
    severity: 'low',
    title: 'Multiple Late Check-ins',
    message: '5 employees checked in late today',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    read: true,
  },
];

// Mock Audit Logs
export const mockAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'user-admin-1',
    userName: 'Admin User',
    action: 'User Created',
    details: 'Created new HR user: hr@company.com',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    ipAddress: '192.168.1.50',
  },
  {
    id: 'log-2',
    userId: 'user-admin-1',
    userName: 'Admin User',
    action: 'Device Registered',
    details: 'Registered new device: Main Entrance - Building A',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    ipAddress: '192.168.1.50',
  },
  {
    id: 'log-3',
    userId: 'user-hr-1',
    userName: 'HR Manager',
    action: 'Report Exported',
    details: 'Exported attendance report for January 2026',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    ipAddress: '192.168.1.75',
  },
];

// Mock AI Insights
export const mockAIInsights: AIInsight[] = [
  {
    id: 'insight-1',
    type: 'anomaly',
    title: 'Unusual Pattern Detected',
    description: 'Engineering department shows 15% decrease in average working hours this week compared to last month',
    priority: 'high',
    timestamp: new Date(),
    data: { department: 'Engineering', change: -15 },
    actions: ['Review workload', 'Schedule team meeting', 'Check project deadlines'],
  },
  {
    id: 'insight-2',
    type: 'prediction',
    title: 'Predicted Absenteeism Spike',
    description: 'AI predicts 20% increase in absences next week based on historical patterns and upcoming holidays',
    priority: 'medium',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    data: { predictedIncrease: 20, confidence: 85 },
    actions: ['Plan backup resources', 'Review critical projects', 'Prepare contingency'],
  },
  {
    id: 'insight-3',
    type: 'recommendation',
    title: 'Optimize Break Times',
    description: 'Analysis shows peak cafeteria usage between 12:30-1:00 PM. Consider staggered lunch breaks for better flow',
    priority: 'low',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    data: { peakTime: '12:30-13:00', utilization: 95 },
    actions: ['Implement staggered breaks', 'Update shift schedules', 'Communicate to teams'],
  },
  {
    id: 'insight-4',
    type: 'summary',
    title: 'This Week\'s Summary',
    description: 'Overall attendance rate: 94.5% (↑2.3% from last week). Punctuality improved by 5%. Engineering and Sales departments leading in consistency.',
    priority: 'medium',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    data: { attendanceRate: 94.5, punctualityImprovement: 5 },
  },
];

export const departments = ['Engineering', 'Marketing', 'Sales', 'Finance', 'Human Resources', 'Operations'];
export const locations = ['Building A', 'Building B', 'Building C'];
