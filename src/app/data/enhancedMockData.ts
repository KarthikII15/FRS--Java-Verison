// Enhanced Mock Data for Enterprise Features

export interface Building {
  id: string;
  name: string;
  address?: string;
  timezone?: string;
  numberOfFloors?: number;
  status: 'active' | 'maintenance' | 'archived';
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  floorNumber: number;
  level: number;
  layoutImageUrl?: string;
  capacity?: number;
  mapScale?: number;
  orientation?: number;
  coordinateSystem?: 'local' | 'global';
  mapVersion?: string;
}

export interface Area {
  id: string;
  floorId: string;
  name: string;
  type: 'Public' | 'Staff Only' | 'Restricted' | 'High Security';
  areaType?: 'workspace' | 'entry-zone' | 'exit-zone' | 'restricted' | 'public';
  accessLevel?: 'public' | 'restricted' | 'high-security';
  departmentOwner?: string;
  polygonCoordinates: { x: number; y: number }[];
  boundaryCoordinates?: { x: number; y: number }[];
  capacity?: number;
  currentOccupancy?: number;
  lastEntryTime?: string;
}

export interface Device {
  id: string;
  name: string;
  type: 'Camera' | 'Edge Device';
  location: string;
  status: 'Online' | 'Offline' | 'Warning';
  lastActive: string;
  assignedPoint: string;
  department?: string;
  ipAddress?: string;
  firmwareVersion?: string;
  buildingId?: string;
  floorId?: string;
  areaId?: string;
  coordinates?: { x: number; y: number };
  mapCoordinates?: { x: number; y: number; rotation: number; scale: number };
  rotationAngle?: number;
  deviceRole?: 'Entry' | 'Exit' | 'Zone' | 'Dual';
  entryExitRole?: 'entry' | 'exit' | 'both' | 'none';
  recognitionMode?: string;
  viewingDirection?: number;
  coverageAngle?: number;
  coverageRange?: number;
  frameRate?: number;
  uptime?: number;
  eventsToday?: number;
  recognitionsToday?: number;
  lastRecognitionTime?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  temperature?: number;
  networkSignal?: 'Strong' | 'Moderate' | 'Weak';
  signalStrength?: string;
  warningState?: 'firmware-outdated' | 'high-temp' | 'low-storage' | 'overload' | 'network-unstable' | null;
  dailyEvents?: number;
  coverageConeAngle?: number;
  coverageRadius?: number;
  isEntryCamera?: boolean;
  isExitCamera?: boolean;
  installationDate?: string;
  lastMaintenance?: string;
  macAddress?: string;
  port?: number;
  serialNumber?: string;
  recognitionAccuracy: number;
  cpuHistory?: number[];
  memHistory?: number[];
  tempHistory?: number[];
  eventHistory?: { time: string; count: number }[];
  floor?: string;
  password?: string;
}

export interface DeviceAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  floorName: string;
  type: string;
  title?: string;
  severity: 'Critical' | 'Warning' | 'Info' | 'high' | 'medium' | 'low';
  timestamp: string;
  resolved: boolean;
  read?: boolean;
  message: string;
}

export interface FacilityEvent {
  id: string;
  type: 'entry' | 'exit' | 'movement' | 'alert' | 'area_entry';
  employeeId: string;
  employeeName: string;
  cameraId?: string;
  cameraName?: string;
  floorId: string;
  areaId?: string;
  areaName?: string;
  timestamp: string;
  coordinates?: { x: number; y: number };
}

export interface MapValidationIssue {
  id: string;
  type: 'no-entry-camera' | 'no-exit-camera' | 'camera-outside-bounds' | 'camera-overlap' | 'unassigned-camera' | 'area-no-camera';
  severity: 'error' | 'warning';
  message: string;
  deviceId?: string;
  floorId: string;
}


export interface Department {
  id: string;
  name: string;
  code: string;
  hrOwner: string;
  employeeCount: number;
  color: string;
}

export interface Shift {
  id: string;
  name: string;
  timeIn: string;
  timeOut: string;
  color: string;
  assignedCount: number;
  gracePeriod?: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  shift: string;
  role: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  joinDate: string;
  exitDate?: string;
  phoneNumber: string;
  employeeId: string;
  profileImage?: string;
  avatarUrl?: string;
}

export interface LiveOfficePresence {
  employeeId: string;
  employeeName: string;
  department: string;
  checkInTime: string;
  checkOutTime?: string;
  duration: string;
  location: string;
  deviceUsed: string;
  status: 'Present' | 'Checked-In Only' | 'Late' | 'Overtime';
  shiftEndTime: string;
  lastSeenCamera: string;
  lastSeenTime: string;
  entryCamera: string;
  floor?: string;
  area?: string;
  hrNote?: string;
}

export interface EntryExitRecord {
  id: string;
  employeeId: string;
  timestamp: string;
  type: 'Entry' | 'Exit';
  deviceId: string;
  location: string;
  imageBlurred: boolean;
  confidence: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  appliedDate: string;
}

export interface WorkforceTrend {
  month: string;
  joiners: number;
  exits: number;
  net: number;
}

// Mock Spatial Data
export const mockBuildings: Building[] = [
  { id: 'b1', name: 'Innovation Tower', address: '123 Tech Park, Block A', status: 'active' },
  { id: 'b2', name: 'Design Studio', address: '456 creative Way, Block B', status: 'active' },
];

export const mockFloors: Floor[] = [
  { id: 'f1', buildingId: 'b1', name: 'Ground Floor', floorNumber: 0, level: 0, capacity: 200 },
  { id: 'f2', buildingId: 'b1', name: 'Product Engineering', floorNumber: 1, level: 1, capacity: 150 },
  { id: 'f3', buildingId: 'b1', name: 'Cloud Operations', floorNumber: 2, level: 2, capacity: 150 },
  { id: 'f4', buildingId: 'b2', name: 'UX Design Lab', floorNumber: 13, level: 1, capacity: 80 },
];

export const mockAreas: Area[] = [
  {
    id: 'area-001',
    floorId: 'fl-001',
    name: 'Main Lobby',
    type: 'Public',
    polygonCoordinates: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }],
    capacity: 50,
    currentOccupancy: 12,
    lastEntryTime: '2026-02-25T10:30:00Z'
  },
  {
    id: 'area-002',
    floorId: 'fl-002',
    name: 'Dev Zone Alpha',
    type: 'Staff Only',
    departmentOwner: 'Engineering',
    polygonCoordinates: [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }, { x: 20, y: 80 }],
    capacity: 80,
    currentOccupancy: 45,
    lastEntryTime: '2026-02-25T10:45:00Z'
  },
  {
    id: 'area-003',
    floorId: 'fl-002',
    name: 'Server Room Alpha',
    type: 'High Security',
    departmentOwner: 'Operations',
    polygonCoordinates: [{ x: 85, y: 85 }, { x: 95, y: 85 }, { x: 95, y: 95 }, { x: 85, y: 95 }],
    capacity: 5,
    currentOccupancy: 1,
    lastEntryTime: '2026-02-25T09:15:00Z'
  },
];

// Mock Devices
export const mockDevices: Device[] = [
  {
    id: 'dev-001',
    name: 'Main Entrance Camera',
    type: 'Camera',
    location: 'Building A - Main Lobby',
    status: 'Online',
    lastActive: '2 mins ago',
    assignedPoint: 'Main Entry',
    ipAddress: '192.168.1.101',
    firmwareVersion: '2.4.1',
    floorId: 'fl-001',
    areaId: 'area-001',
    coordinates: { x: 50, y: 15 },
    rotationAngle: 180,
    deviceRole: 'Entry',
    dailyEvents: 148,
    eventsToday: 148,
    recognitionsToday: 142,
    lastRecognitionTime: '2026-02-25T10:42:00Z',
    uptime: 99.8,
    networkSignal: 'Strong',
    coverageConeAngle: 120,
    coverageRadius: 25,
    isEntryCamera: true,
    installationDate: '2025-01-10',
    lastMaintenance: '2025-10-15',
    serialNumber: 'CAM-99281',
    recognitionAccuracy: 98.5,
    eventHistory: [
      { time: '08:00', count: 12 },
      { time: '09:00', count: 45 },
      { time: '10:00', count: 91 }
    ]
  },
  {
    id: 'dev-002',
    name: 'Exit Gate Camera',
    type: 'Camera',
    location: 'Building A - Exit Gate',
    status: 'Online',
    lastActive: '1 min ago',
    assignedPoint: 'Exit Point',
    ipAddress: '192.168.1.102',
    firmwareVersion: '2.4.1',
    floorId: 'fl-001',
    areaId: 'area-001',
    coordinates: { x: 50, y: 85 },
    rotationAngle: 0,
    deviceRole: 'Exit',
    dailyEvents: 132,
    eventsToday: 132,
    recognitionsToday: 132,
    lastRecognitionTime: '2026-02-25T10:55:00Z',
    uptime: 99.9,
    networkSignal: 'Strong',
    coverageConeAngle: 90,
    coverageRadius: 20,
    isExitCamera: true,
    installationDate: '2025-01-10',
    lastMaintenance: '2025-10-15',
    serialNumber: 'CAM-99282',
    recognitionAccuracy: 97.8
  },
  {
    id: 'dev-003',
    name: 'Building B Entry',
    type: 'Edge Device',
    location: 'Building B - Main Door',
    status: 'Online',
    lastActive: '5 mins ago',
    assignedPoint: 'Building B Entry',
    ipAddress: '192.168.1.201',
    firmwareVersion: '3.1.0',
    deviceRole: 'Dual',
    dailyEvents: 85,
    eventsToday: 85,
    recognitionsToday: 82,
    uptime: 98.5,
    cpuUsage: 45,
    memoryUsage: 62,
    temperature: 42,
    networkSignal: 'Moderate',
    warningState: 'firmware-outdated',
    installationDate: '2025-02-15',
    serialNumber: 'LPU-11029',
    recognitionAccuracy: 96.5,
    cpuHistory: [40, 42, 45, 48, 45, 43, 45, 47, 46, 45, 44, 45]
  },
  {
    id: 'dev-004',
    name: 'Cafeteria Camera',
    type: 'Camera',
    location: 'Cafeteria - Entry',
    status: 'Offline',
    lastActive: '2 hours ago',
    assignedPoint: 'Cafeteria',
    ipAddress: '192.168.1.103',
    firmwareVersion: '2.4.0',
    deviceRole: 'Zone',
    dailyEvents: 0,
    eventsToday: 0,
    uptime: 94.2,
    networkSignal: 'Weak',
    installationDate: '2025-03-20',
    serialNumber: 'CAM-88712',
    recognitionAccuracy: 92.1
  },
  {
    id: 'dev-005',
    name: 'Parking Entry Device',
    type: 'Edge Device',
    location: 'Parking - Gate A',
    status: 'Online',
    lastActive: '3 mins ago',
    assignedPoint: 'Parking Entry',
    ipAddress: '192.168.1.202',
    firmwareVersion: '3.1.0',
    deviceRole: 'Entry',
    dailyEvents: 215,
    eventsToday: 215,
    recognitionsToday: 210,
    uptime: 99.5,
    cpuUsage: 78,
    memoryUsage: 55,
    temperature: 58,
    networkSignal: 'Strong',
    warningState: 'high-temp',
    installationDate: '2025-01-20',
    serialNumber: 'LPU-11030',
    recognitionAccuracy: 94.8,
    cpuHistory: [65, 68, 70, 72, 75, 78, 80, 79, 78, 77, 78, 78]
  },
  {
    id: 'dev-006',
    name: 'Server Room Access',
    type: 'Camera',
    location: 'Building A - 3rd Floor',
    status: 'Online',
    lastActive: '10 mins ago',
    assignedPoint: 'Restricted Area',
    ipAddress: '192.168.1.104',
    firmwareVersion: '2.4.1',
    floorId: 'fl-002',
    areaId: 'area-003',
    coordinates: { x: 90, y: 90 },
    rotationAngle: 45,
    deviceRole: 'Dual',
    dailyEvents: 42,
    eventsToday: 42,
    recognitionsToday: 42,
    uptime: 99.9,
    networkSignal: 'Strong',
    coverageConeAngle: 60,
    coverageRadius: 15,
    installationDate: '2025-04-12',
    serialNumber: 'CAM-11234',
    recognitionAccuracy: 99.8
  },
];

export const mockDeviceAlerts: DeviceAlert[] = [
  {
    id: 'alt-001',
    deviceId: 'dev-004',
    deviceName: 'Cafeteria Camera',
    floorName: 'Floor 1',
    type: 'Camera Offline',
    severity: 'Critical',
    timestamp: '2026-02-25T09:00:00Z',
    resolved: false,
    message: 'Camera connection lost'
  },
  {
    id: 'alt-002',
    deviceId: 'dev-005',
    deviceName: 'Parking Entry Device',
    floorName: 'Parking',
    type: 'High Temperature',
    severity: 'Warning',
    timestamp: '2026-02-25T10:45:00Z',
    resolved: false,
    message: 'Device core temperature reached 58°C'
  },
  {
    id: 'alt-003',
    deviceId: 'dev-003',
    deviceName: 'Building B Entry',
    floorName: 'Floor 1',
    type: 'Firmware Outdated',
    severity: 'Info',
    timestamp: '2026-02-25T08:30:00Z',
    resolved: false,
    message: 'New firmware v3.2.0 available'
  }
];


// Mock Departments
export const mockDepartments: Department[] = [
  { id: 'dept-001', name: 'Engineering', code: 'ENG', hrOwner: 'Sarah Johnson', employeeCount: 45, color: '#3B82F6' },
  { id: 'dept-002', name: 'Sales', code: 'SAL', hrOwner: 'Michael Chen', employeeCount: 32, color: '#10B981' },
  { id: 'dept-003', name: 'Marketing', code: 'MKT', hrOwner: 'Emma Davis', employeeCount: 18, color: '#F59E0B' },
  { id: 'dept-004', name: 'Operations', code: 'OPS', hrOwner: 'David Brown', employeeCount: 28, color: '#8B5CF6' },
  { id: 'dept-005', name: 'Human Resources', code: 'HR', hrOwner: 'Lisa Anderson', employeeCount: 12, color: '#EC4899' },
  { id: 'dept-006', name: 'Finance', code: 'FIN', hrOwner: 'Robert Wilson', employeeCount: 15, color: '#6366F1' },
];

// Mock Shifts
export const mockShifts: Shift[] = [
  { id: 'shift-001', name: 'Morning Shift', timeIn: '08:00 AM', timeOut: '05:00 PM', color: '#3B82F6', assignedCount: 85 },
  { id: 'shift-002', name: 'Evening Shift', timeIn: '02:00 PM', timeOut: '11:00 PM', color: '#F59E0B', assignedCount: 32 },
  { id: 'shift-003', name: 'Night Shift', timeIn: '10:00 PM', timeOut: '07:00 AM', color: '#8B5CF6', assignedCount: 18 },
  { id: 'shift-004', name: 'Flexible Hours', timeIn: 'Flexible', timeOut: 'Flexible', color: '#10B981', assignedCount: 15 },
];

// Mock Employees
export const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    employeeId: 'EMP001',
    name: 'John Smith',
    email: 'john.smith@company.com',
    department: 'Engineering',
    shift: 'Morning Shift',
    role: 'Senior Developer',
    status: 'Active',
    joinDate: '2023-01-15',
    phoneNumber: '+1 234-567-8901',
  },
  {
    id: 'emp-002',
    employeeId: 'EMP002',
    name: 'Sarah Johnson',
    email: 'sarah.j@company.com',
    department: 'Human Resources',
    shift: 'Morning Shift',
    role: 'HR Manager',
    status: 'Active',
    joinDate: '2022-06-10',
    phoneNumber: '+1 234-567-8902',
  },
  {
    id: 'emp-003',
    employeeId: 'EMP003',
    name: 'Michael Chen',
    email: 'michael.c@company.com',
    department: 'Sales',
    shift: 'Morning Shift',
    role: 'Sales Lead',
    status: 'Active',
    joinDate: '2023-03-20',
    phoneNumber: '+1 234-567-8903',
  },
  {
    id: 'emp-004',
    employeeId: 'EMP004',
    name: 'Emily Davis',
    email: 'emily.d@company.com',
    department: 'Marketing',
    shift: 'Morning Shift',
    role: 'Marketing Manager',
    status: 'On Leave',
    joinDate: '2022-11-05',
    phoneNumber: '+1 234-567-8904',
  },
  {
    id: 'emp-005',
    employeeId: 'EMP005',
    name: 'Robert Wilson',
    email: 'robert.w@company.com',
    department: 'Finance',
    shift: 'Morning Shift',
    role: 'Finance Director',
    status: 'Active',
    joinDate: '2021-08-12',
    phoneNumber: '+1 234-567-8905',
  },
  {
    id: 'emp-006',
    employeeId: 'EMP006',
    name: 'Jessica Lee',
    email: 'jessica.l@company.com',
    department: 'Engineering',
    shift: 'Evening Shift',
    role: 'Frontend Developer',
    status: 'Active',
    joinDate: '2023-05-11',
    phoneNumber: '+1 234-567-8906',
  },
  {
    id: 'emp-007',
    employeeId: 'EMP007',
    name: 'David Brown',
    email: 'david.b@company.com',
    department: 'Engineering',
    shift: 'Morning Shift',
    role: 'Backend Developer',
    status: 'Active',
    joinDate: '2022-09-01',
    phoneNumber: '+1 234-567-8907',
  },
  {
    id: 'emp-008',
    employeeId: 'EMP008',
    name: 'Lisa Anderson',
    email: 'lisa.a@company.com',
    department: 'Human Resources',
    shift: 'Morning Shift',
    role: 'HR Specialist',
    status: 'Active',
    joinDate: '2021-12-10',
    phoneNumber: '+1 234-567-8908',
  },
  {
    id: 'emp-009',
    employeeId: 'EMP009',
    name: 'Mark Taylor',
    email: 'mark.t@company.com',
    department: 'Sales',
    shift: 'Evening Shift',
    role: 'Sales Executive',
    status: 'Active',
    joinDate: '2023-01-20',
    phoneNumber: '+1 234-567-8909',
  },
  {
    id: 'emp-010',
    employeeId: 'EMP010',
    name: 'Emma Thomas',
    email: 'emma.t@company.com',
    department: 'Marketing',
    shift: 'Flexible Hours',
    role: 'Content Creator',
    status: 'Active',
    joinDate: '2024-02-15',
    phoneNumber: '+1 234-567-8910',
  },
];

// Mock Live Office Presence
export const mockLivePresence: LiveOfficePresence[] = [
  {
    employeeId: 'emp-001',
    employeeName: 'John Smith',
    department: 'Engineering',
    checkInTime: '08:15 AM',
    duration: '3h 45m',
    location: 'Building A - Main Entry',
    deviceUsed: 'Main Entrance Camera',
    status: 'Present',
    shiftEndTime: '05:00 PM',
    lastSeenCamera: 'Building A - 2nd Floor Camera',
    lastSeenTime: '11:45 AM',
    entryCamera: 'Main Entrance Camera',
    floor: 'Floor 2',
    area: 'Eng Zone A'
  },
  {
    employeeId: 'emp-002',
    employeeName: 'Sarah Johnson',
    department: 'Human Resources',
    checkInTime: '08:05 AM',
    duration: '3h 55m',
    location: 'Building A - Main Entry',
    deviceUsed: 'Main Entrance Camera',
    status: 'Present',
    shiftEndTime: '05:00 PM',
    lastSeenCamera: 'Building A - 1st Floor Lobby',
    lastSeenTime: '12:00 PM',
    entryCamera: 'Main Entrance Camera',
    floor: 'Floor 1',
    area: 'HR Suite'
  },
  {
    employeeId: 'emp-003',
    employeeName: 'Michael Chen',
    department: 'Sales',
    checkInTime: '09:45 AM',
    duration: '2h 15m',
    location: 'Building B - Main Door',
    deviceUsed: 'Building B Entry',
    status: 'Late',
    shiftEndTime: '06:00 PM',
    lastSeenCamera: 'Building B - Sales Area',
    lastSeenTime: '12:00 PM',
    entryCamera: 'Building B Entry',
    floor: 'Floor 1',
    area: 'Sales Floor'
  },
  {
    employeeId: 'emp-006',
    employeeName: 'David Brown',
    department: 'Operations',
    checkInTime: '08:00 AM',
    duration: '10h 30m',
    location: 'Building A - Main Entry',
    deviceUsed: 'Main Entrance Camera',
    status: 'Overtime',
    shiftEndTime: '05:00 PM',
    lastSeenCamera: 'Building A - Data Center',
    lastSeenTime: '06:30 PM',
    entryCamera: 'Main Entrance Camera',
    floor: 'Basement',
    area: 'Data Center'
  },
  {
    employeeId: 'emp-007',
    employeeName: 'Lisa Anderson',
    department: 'Human Resources',
    checkInTime: '08:30 AM',
    duration: '6h 15m',
    location: 'Building A - Main Entry',
    deviceUsed: 'Main Entrance Camera',
    status: 'Checked-In Only',
    shiftEndTime: '05:30 PM',
    lastSeenCamera: 'Building A - Cafeteria',
    lastSeenTime: '02:45 PM',
    entryCamera: 'Main Entrance Camera',
    floor: 'Floor 2',
    area: 'Cafeteria'
  },
  {
    employeeId: 'emp-004',
    employeeName: 'James Miller',
    department: 'Engineering',
    checkInTime: '08:00 AM',
    duration: '14h 20m',
    location: 'Building A - Main Entry',
    deviceUsed: 'Main Entrance Camera',
    status: 'Checked-In Only',
    shiftEndTime: '05:00 PM',
    lastSeenCamera: 'Building A - Lab 3',
    lastSeenTime: '10:20 PM',
    entryCamera: 'Main Entrance Camera',
    floor: 'Floor 3',
    area: 'Hardware Lab',
    hrNote: 'Working on critical firmware patch.'
  }
];

// Mock Leave Requests
export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-001',
    employeeId: 'emp-004',
    employeeName: 'Emily Davis',
    department: 'Marketing',
    leaveType: 'Sick Leave',
    startDate: '2026-02-24',
    endDate: '2026-02-25',
    days: 2,
    status: 'Approved',
    reason: 'Medical appointment',
    appliedDate: '2026-02-20',
  },
  {
    id: 'leave-002',
    employeeId: 'emp-008',
    employeeName: 'James Wilson',
    department: 'Engineering',
    leaveType: 'Vacation',
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    days: 5,
    status: 'Pending',
    reason: 'Personal travel',
    appliedDate: '2026-02-22',
  },
  {
    id: 'leave-003',
    employeeId: 'emp-009',
    employeeName: 'Anna Martinez',
    department: 'Finance',
    leaveType: 'Personal Leave',
    startDate: '2026-02-26',
    endDate: '2026-02-26',
    days: 1,
    status: 'Approved',
    reason: 'Family matter',
    appliedDate: '2026-02-23',
  },
];

// Mock Workforce Trends
export const mockWorkforceTrends: WorkforceTrend[] = [
  { month: 'Sep', joiners: 8, exits: 3, net: 5 },
  { month: 'Oct', joiners: 12, exits: 5, net: 7 },
  { month: 'Nov', joiners: 6, exits: 4, net: 2 },
  { month: 'Dec', joiners: 4, exits: 7, net: -3 },
  { month: 'Jan', joiners: 15, exits: 2, net: 13 },
  { month: 'Feb', joiners: 9, exits: 6, net: 3 },
];

// Mock Entry/Exit Records
export const mockEntryExitRecords: Record<string, EntryExitRecord[]> = {
  'emp-001': [
    {
      id: 'record-001',
      employeeId: 'emp-001',
      timestamp: '2026-02-24 08:15:23',
      type: 'Entry',
      deviceId: 'dev-001',
      location: 'Building A - Main Entry',
      imageBlurred: false,
      confidence: 98.5,
    },
    {
      id: 'record-002',
      employeeId: 'emp-001',
      timestamp: '2026-02-23 17:32:45',
      type: 'Exit',
      deviceId: 'dev-002',
      location: 'Building A - Exit Gate',
      imageBlurred: false,
      confidence: 97.8,
    },
  ],
};
// Mock Facility Events
export const mockFacilityEvents: FacilityEvent[] = [
  { id: 'evt-001', type: 'entry', employeeId: 'emp-001', employeeName: 'John Smith', cameraId: 'dev-001', cameraName: 'Main Entrance Camera', floorId: 'fl-001', timestamp: '2026-02-25T08:15:00Z', coordinates: { x: 50, y: 15 } },
  { id: 'evt-002', type: 'movement', employeeId: 'emp-001', employeeName: 'John Smith', cameraId: 'dev-006', cameraName: 'Server Room Access', floorId: 'fl-002', timestamp: '2026-02-25T08:45:00Z', coordinates: { x: 90, y: 90 } },
  { id: 'evt-003', type: 'entry', employeeId: 'emp-002', employeeName: 'Sarah Johnson', cameraId: 'dev-001', cameraName: 'Main Entrance Camera', floorId: 'fl-001', timestamp: '2026-02-25T08:05:00Z', coordinates: { x: 50, y: 15 } },
  { id: 'evt-004', type: 'alert', employeeId: 'emp-003', employeeName: 'Michael Chen', cameraId: 'dev-006', cameraName: 'Server Room Access', floorId: 'fl-002', timestamp: '2026-02-25T10:00:00Z', coordinates: { x: 90, y: 90 } },
  { id: 'evt-005', type: 'exit', employeeId: 'emp-001', employeeName: 'John Smith', cameraId: 'dev-002', cameraName: 'Exit Gate Camera', floorId: 'fl-001', timestamp: '2026-02-25T17:30:00Z', coordinates: { x: 50, y: 85 } },
];

// Mock Map Validation Issues
export const mockMapValidationIssues: MapValidationIssue[] = [
  { id: 'val-001', type: 'no-exit-camera', severity: 'warning', message: 'No exit camera configured for Floor 1', floorId: 'fl-001' },
  { id: 'val-002', type: 'camera-outside-bounds', severity: 'error', message: 'Camera "Parking Cam" is outside map boundaries', deviceId: 'dev-005', floorId: 'fl-001' },
  { id: 'val-003', type: 'unassigned-camera', severity: 'warning', message: 'Camera "Cafeteria Camera" is not assigned to any area', deviceId: 'dev-004', floorId: 'fl-001' },
];

export const mockAlerts = mockDeviceAlerts;
