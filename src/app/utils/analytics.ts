import { AttendanceRecord, Employee, AnalyticsData, DashboardMetrics, PerformerData } from '../types';

export const calculateDashboardMetrics = (
  employees: Employee[],
  attendanceRecords: AttendanceRecord[],
  dateFilter?: { start: Date; end: Date }
): DashboardMetrics => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's records
  const todayRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });

  // Filter records by date range if provided
  const filteredRecords = dateFilter
    ? attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= dateFilter.start && recordDate <= dateFilter.end;
      })
    : attendanceRecords;

  const presentToday = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const lateToday = todayRecords.filter(r => r.status === 'late').length;
  const absentToday = todayRecords.filter(r => r.status === 'absent').length;
  const onLeave = todayRecords.filter(r => r.status === 'on-leave').length;
  const onBreak = 0; // This would be real-time data

  const totalWorkingHours = filteredRecords.reduce((sum, r) => sum + r.workingHours, 0);
  const avgWorkingHours = filteredRecords.length > 0 ? totalWorkingHours / filteredRecords.length : 0;

  const totalOvertimeHours = filteredRecords.reduce((sum, r) => sum + r.overtime, 0);

  const totalPossibleAttendance = employees.length * getWorkingDaysInRange(
    dateFilter?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dateFilter?.end || new Date()
  );
  const totalPresent = filteredRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const attendanceRate = totalPossibleAttendance > 0 ? (totalPresent / totalPossibleAttendance) * 100 : 0;

  const onTimeRecords = filteredRecords.filter(r => !r.isLate && r.status !== 'absent').length;
  const punctualityRate = filteredRecords.length > 0 ? (onTimeRecords / filteredRecords.length) * 100 : 0;

  return {
    totalEmployees: employees.length,
    presentToday,
    lateToday,
    absentToday,
    onBreak,
    onLeave,
    avgWorkingHours: Math.round(avgWorkingHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    punctualityRate: Math.round(punctualityRate * 100) / 100,
  };
};

export const getWorkingDaysInRange = (start: Date, end: Date): number => {
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

export const generateAnalytics = (
  employees: Employee[],
  attendanceRecords: AttendanceRecord[]
): AnalyticsData => {
  // Attendance trends (last 30 days)
  const attendanceTrends = generateTrendData(attendanceRecords, 30);
  
  // Working hours trends
  const workingHoursTrends = generateWorkingHoursTrends(attendanceRecords, 30);
  
  // Department comparison
  const departmentComparison = generateDepartmentComparison(employees, attendanceRecords);
  
  // Hourly activity
  const hourlyActivity = generateHourlyActivity(attendanceRecords);
  
  // Weekly pattern
  const weeklyPattern = generateWeeklyPattern(attendanceRecords);
  
  // Top and bottom performers
  const performers = calculatePerformers(employees, attendanceRecords);

  return {
    attendanceTrends,
    workingHoursTrends,
    departmentComparison,
    hourlyActivity,
    weeklyPattern,
    topPerformers: performers.top,
    bottomPerformers: performers.bottom,
  };
};

const generateTrendData = (records: AttendanceRecord[], days: number) => {
  const trends = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const dayRecords = records.filter(r => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === date.getTime();
    });
    
    const presentCount = dayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const totalCount = dayRecords.length;
    const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
    
    trends.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(rate * 100) / 100,
    });
  }
  
  return trends;
};

const generateWorkingHoursTrends = (records: AttendanceRecord[], days: number) => {
  const trends = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const dayRecords = records.filter(r => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === date.getTime();
    });
    
    const avgHours = dayRecords.length > 0
      ? dayRecords.reduce((sum, r) => sum + r.workingHours, 0) / dayRecords.length
      : 0;
    
    trends.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(avgHours * 100) / 100,
    });
  }
  
  return trends;
};

const generateDepartmentComparison = (employees: Employee[], records: AttendanceRecord[]) => {
  const departments = [...new Set(employees.map(e => e.department))];
  
  return departments.map(dept => {
    const deptEmployees = employees.filter(e => e.department === dept);
    const deptRecords = records.filter(r => 
      deptEmployees.some(e => e.id === r.employeeId)
    );
    
    const presentCount = deptRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const totalCount = deptRecords.length;
    const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
    
    return {
      name: dept,
      value: Math.round(rate * 100) / 100,
      percentage: Math.round(rate * 100) / 100,
    };
  });
};

const generateHourlyActivity = (records: AttendanceRecord[]) => {
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    checkIns: 0,
    checkOuts: 0,
    active: 0,
  }));
  
  records.forEach(record => {
    if (record.checkIn) {
      const hour = new Date(record.checkIn).getHours();
      hourlyData[hour].checkIns++;
    }
    if (record.checkOut) {
      const hour = new Date(record.checkOut).getHours();
      hourlyData[hour].checkOuts++;
    }
  });
  
  return hourlyData;
};

const generateWeeklyPattern = (records: AttendanceRecord[]) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const weekData = days.map(day => ({
    day,
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
  }));
  
  records.forEach(record => {
    const dayOfWeek = new Date(record.date).getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dayIndex = dayOfWeek - 1;
      
      if (record.status === 'present') weekData[dayIndex].present++;
      else if (record.status === 'late') weekData[dayIndex].late++;
      else if (record.status === 'absent') weekData[dayIndex].absent++;
      else if (record.status === 'on-leave') weekData[dayIndex].onLeave++;
    }
  });
  
  return weekData;
};

const calculatePerformers = (employees: Employee[], records: AttendanceRecord[]) => {
  const performerData: PerformerData[] = employees.map(employee => {
    const employeeRecords = records.filter(r => r.employeeId === employee.id);
    
    const presentCount = employeeRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const totalCount = employeeRecords.length;
    const attendanceRate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
    
    const onTimeCount = employeeRecords.filter(r => !r.isLate && r.status !== 'absent').length;
    const punctualityRate = totalCount > 0 ? (onTimeCount / totalCount) * 100 : 0;
    
    const avgWorkingHours = employeeRecords.length > 0
      ? employeeRecords.reduce((sum, r) => sum + r.workingHours, 0) / employeeRecords.length
      : 0;
    
    const score = (attendanceRate * 0.4) + (punctualityRate * 0.4) + (avgWorkingHours * 5);
    
    return {
      employeeId: employee.id,
      name: employee.name,
      department: employee.department,
      score: Math.round(score * 100) / 100,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      avgWorkingHours: Math.round(avgWorkingHours * 100) / 100,
      punctualityRate: Math.round(punctualityRate * 100) / 100,
    };
  });
  
  performerData.sort((a, b) => b.score - a.score);
  
  return {
    top: performerData.slice(0, 5),
    bottom: performerData.slice(-5).reverse(),
  };
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    present: 'text-green-600',
    late: 'text-yellow-600',
    absent: 'text-red-600',
    'on-leave': 'text-blue-600',
    'on-break': 'text-orange-600',
  };
  return colors[status] || 'text-gray-600';
};

export const getStatusBadgeColor = (status: string): string => {
  const colors: Record<string, string> = {
    present: 'bg-green-100 text-green-800',
    late: 'bg-yellow-100 text-yellow-800',
    absent: 'bg-red-100 text-red-800',
    'on-leave': 'bg-blue-100 text-blue-800',
    'on-break': 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};
