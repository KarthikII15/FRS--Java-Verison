import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  UserPlus,
  UserMinus,
  Users,
  ScanFace,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Edit,
  UserX,
  Mail,
  Phone,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockEmployees, mockWorkforceTrends, Employee } from '../../data/enhancedMockData';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { EmployeeProfileDashboard } from './EmployeeProfileDashboard';
import { FaceEnrollButton } from './FaceEnrollButton';
import { useAuth } from '../../contexts/AuthContext';
import { authConfig } from '../../config/authConfig';
import { apiRequest } from '../../services/http/apiClient';

type EmployeeWithEnrollment = Employee & {
  faceEnrolled?: boolean;
};

export const EmployeeLifecycleManagement: React.FC = () => {
  const { accessToken } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithEnrollment[]>(
    mockEmployees.map((e) => ({ ...e, faceEnrolled: false }))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'On Leave' | 'Inactive'>('all');
  const [filterEnrollment, setFilterEnrollment] = useState<'all' | 'enrolled' | 'not_enrolled'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authConfig.mode === 'mock') {
      setEmployees(mockEmployees.map((e) => ({ ...e, faceEnrolled: false })));
      return;
    }
    if (!accessToken) return;

    let isMounted = true;
    const fetchEmployees = async () => {
      setIsLoading(true);
      try {
        const res = await apiRequest<{ data: any[] }>('/employees', { accessToken });
        const mapped: EmployeeWithEnrollment[] = (res.data || []).map((e: any) => ({
          ...e,
          faceEnrolled: !!(e.faceEnrolled ?? e.face_enrolled),
        }));
        if (isMounted) {
          setEmployees(mapped);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load employees';
        toast.error('Employee fetch failed', { description: msg });
        if (isMounted) {
          setEmployees(mockEmployees.map((e) => ({ ...e, faceEnrolled: false })));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchEmployees();
    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    const matchesEnrollment = filterEnrollment === 'all'
      || (filterEnrollment === 'enrolled' && emp.faceEnrolled)
      || (filterEnrollment === 'not_enrolled' && !emp.faceEnrolled);
    return matchesSearch && matchesStatus && matchesEnrollment;
  });

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const enrolledCount = employees.filter(e => e.faceEnrolled).length;

  // Calculate this month's stats
  const latestTrend = mockWorkforceTrends[mockWorkforceTrends.length - 1];

  const handleOnboard = (empData: Partial<Employee> & { lastName?: string }) => {
    const newEmp: EmployeeWithEnrollment = {
      id: `EMP-${Math.floor(Math.random() * 10000)}`,
      employeeId: empData.employeeId || `EMP${Math.floor(Math.random() * 1000)}`,
      name: `${empData.name} ${empData.lastName || ''}`.trim() || 'New Employee',
      email: empData.email || '',
      department: empData.department || 'Unassigned',
      role: empData.role || 'Employee',
      shift: empData.shift || 'Flexible',
      status: 'Active',
      joinDate: empData.joinDate || new Date().toISOString().split('T')[0],
      phoneNumber: empData.phoneNumber || '',
      profileImage: '',
      faceEnrolled: false,
    };

    setEmployees(prev => [newEmp, ...prev]);
    toast.success("Employee Onboarded", { description: `${newEmp.name} has been added to the system.` });
    setIsAddDialogOpen(false);
  };

  const handleEdit = (updatedEmp: EmployeeWithEnrollment) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    toast.success("Employee Updated", { description: `${updatedEmp.name}'s profile has been updated.` });
  };

  const handleOffboard = (id: string, name: string) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: 'Inactive' } : e));
    toast.success("Employee Offboarded", { description: `${name} has been marked as inactive.` });
  };

  if (selectedEmployee) {
    return (
      <EmployeeProfileDashboard
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className={cn("text-xl font-semibold", lightTheme.text.primary, "dark:text-white")}>Employee Lifecycle</h3>
          <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
            Manage onboarding, status, and biometric readiness
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ScanFace className="w-4 h-4 mr-2 text-emerald-500" />
                Bulk Enroll
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Bulk Face Enrollment</DialogTitle>
                <DialogDescription>
                  Enroll multiple employees at once by uploading a folder of photos named after their employee IDs.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <pre className="text-xs p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-border overflow-x-auto">
AUTH_TOKEN=&lt;your-token&gt; node backend/scripts/bulk_enroll.js /path/to/photos
                </pre>
                <p className={cn("text-xs", lightTheme.text.muted)}>
                  Photos must be named: <span className="font-mono">EMP001.jpg</span> or <span className="font-mono">42.jpg</span>
                </p>
                <p className={cn("text-xs", lightTheme.text.muted)}>
                  The script processes up to 3 employees in parallel and outputs a CSV results file.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const cmd = 'AUTH_TOKEN=<your-token> node backend/scripts/bulk_enroll.js /path/to/photos';
                      navigator.clipboard.writeText(cmd);
                      toast.success('Command copied');
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Command
                  </Button>
                  <Button onClick={() => setIsBulkDialogOpen(false)} className="ml-auto">
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee profile for onboarding
                </DialogDescription>
              </DialogHeader>
              <AddEmployeeForm onClose={() => setIsAddDialogOpen(false)} onAdd={handleOnboard} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Total Workforce</p>
                <p className={cn("text-2xl font-bold mt-1", lightTheme.text.primary, "dark:text-white")}>{employees.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{activeCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Joiners (This Month)</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{latestTrend.joiners}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className={cn("text-xs font-medium", lightTheme.status.success)}>New additions</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Exits (This Month)</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{latestTrend.exits}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-orange-600" />
                  <span className={cn("text-xs font-medium", lightTheme.status.warning)}>Departures</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <UserMinus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Face Enrolled</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{enrolledCount}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ScanFace className="w-3 h-3 text-emerald-600" />
                  <span className={cn("text-xs font-medium", lightTheme.status.success)}>Camera-ready</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                <ScanFace className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workforce Trend Chart */}
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardHeader>
          <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Workforce Change Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mockWorkforceTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke={lightTheme.border.default.replace('border-', '') === 'gray-100' ? '#f3f4f6' : '#e5e7eb'} className="dark:stroke-gray-800" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: lightTheme.text.muted.replace('text-', '') === 'gray-500' ? '#6b7280' : '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: lightTheme.text.muted.replace('text-', '') === 'gray-500' ? '#6b7280' : '#9ca3af', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${lightTheme.border.default.replace('border-', '') === 'gray-100' ? '#f3f4f6' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="joiners" fill="#3B82F6" name="Joiners" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="exits" fill="#F59E0B" name="Exits" radius={[4, 4, 0, 0]} barSize={40} />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#10B981"
                  strokeWidth={3}
                  name="Net Change"
                  dot={{ r: 4, fill: "#10B981", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={cn("absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4", lightTheme.text.muted)} />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEnrollment} onValueChange={(val: any) => setFilterEnrollment(val)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Enrollment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Enrollment</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardHeader>
          <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Employee Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn("p-4 rounded-lg animate-pulse", lightTheme.background.secondary, "dark:bg-gray-800/50")}>
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-3 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            )}
            {!isLoading && filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onEdit={handleEdit}
                onOffboard={handleOffboard}
                onClick={() => setSelectedEmployee(employee)}
              />
            ))}

            {!isLoading && filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No employees found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const EmployeeCard: React.FC<{
  employee: EmployeeWithEnrollment;
  onEdit: (e: EmployeeWithEnrollment) => void;
  onOffboard: (id: string, name: string) => void;
  onClick: () => void;
}> = ({ employee, onEdit, onOffboard, onClick }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return cn(lightTheme.status.successBg, lightTheme.status.success, "dark:bg-green-900/20 dark:text-green-300");
      case 'On Leave':
        return cn(lightTheme.status.infoBg, lightTheme.status.info, "dark:bg-blue-900/20 dark:text-blue-300");
      case 'Inactive':
        return cn(lightTheme.background.secondary, lightTheme.text.muted, "dark:bg-gray-800 dark:text-gray-300");
      default:
        return cn(lightTheme.background.secondary, lightTheme.text.muted, "dark:bg-gray-800 dark:text-gray-300");
    }
  };

  return (
    <div className={cn("flex items-center justify-between p-4 rounded-lg hover:shadow-md transition-shadow cursor-pointer group", lightTheme.background.secondary, "dark:bg-gray-800/50")} onClick={onClick}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 group-hover:shadow-md transition-all">
          {employee.name.split(' ').map((n: string) => n[0]).join('')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("font-medium transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400", lightTheme.text.primary, "dark:text-white")}>{employee.name}</p>
            <Badge variant="outline" className="text-xs">
              {employee.employeeId}
            </Badge>
            <Badge className={`${getStatusColor(employee.status)} text-xs`}>
              {employee.status}
            </Badge>
            <FaceEnrollButton
              employeeId={String(employee.id)}
              employeeName={employee.name}
              enrolled={employee.faceEnrolled ?? false}
              compact
            />
          </div>

          <div className={cn("flex items-center gap-4 mt-1 text-sm flex-wrap", lightTheme.text.secondary, "dark:text-gray-300")}>
            <span>{employee.role}</span>
            <span>•</span>
            <span>{employee.department}</span>
            <span>•</span>
            <span>{employee.shift}</span>
          </div>

          <div className={cn("flex items-center gap-4 mt-1 text-xs flex-wrap", lightTheme.text.muted, "dark:text-gray-400")}>
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span>{employee.email}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{employee.phoneNumber}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 ml-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>
                Update employee information
              </DialogDescription>
            </DialogHeader>
            <EditEmployeeForm
              employee={employee}
              onClose={() => setIsEditDialogOpen(false)}
              onEdit={(e) => {
                onEdit(e);
                setIsEditDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {employee.status === 'Active' && (
          <Button
            variant="outline"
            size="sm"
            className="text-orange-600 hover:text-orange-700"
            onClick={() => onOffboard(employee.id, employee.name)}
          >
            <UserX className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

const AddEmployeeForm: React.FC<{ onClose: () => void; onAdd: (d: any) => void }> = ({ onClose, onAdd }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [department, setDepartment] = useState('');
  const [shift, setShift] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = () => {
    if (!firstName || !lastName || !email) {
      toast.error('Validation Error', { description: 'First Name, Last Name, and Email are required.' });
      return;
    }
    onAdd({
      name: firstName,
      lastName,
      email,
      phoneNumber: phone,
      employeeId,
      joinDate,
      department,
      shift,
      role
    });
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First Name</Label>
          <Input id="first-name" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last Name</Label>
          <Input id="last-name" placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john.smith@company.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" placeholder="+1 234-567-8900" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee-id">Employee ID</Label>
          <Input id="employee-id" placeholder="EMP001" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="join-date">Join Date</Label>
          <Input id="join-date" type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger id="department">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engineering">Engineering</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="hr">Human Resources</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shift">Assign Shift</Label>
        <Select value={shift} onValueChange={setShift}>
          <SelectTrigger id="shift">
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">Morning Shift</SelectItem>
            <SelectItem value="evening">Evening Shift</SelectItem>
            <SelectItem value="night">Night Shift</SelectItem>
            <SelectItem value="flexible">Flexible Hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Job Role</Label>
        <Input id="role" placeholder="e.g., Software Engineer" value={role} onChange={e => setRole(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit}>
          <UserPlus className="w-4 h-4 mr-2" />
          Onboard Employee
        </Button>
      </div>
    </div>
  );
};

const EditEmployeeForm: React.FC<{ employee: Employee; onClose: () => void; onEdit: (e: Employee) => void }> = ({ employee, onClose, onEdit }) => {
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phoneNumber);
  const [department, setDepartment] = useState(employee.department.toLowerCase());
  const [shift, setShift] = useState(employee.shift.toLowerCase().replace(' ', '-'));
  const [role, setRole] = useState(employee.role);

  const handleSubmit = () => {
    onEdit({
      ...employee,
      email,
      phoneNumber: phone,
      department: department.charAt(0).toUpperCase() + department.slice(1),
      shift: shift.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      role
    });
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Employee ID</Label>
          <Input defaultValue={employee.employeeId} disabled className="bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="space-y-2">
          <Label>Join Date</Label>
          <Input defaultValue={employee.joinDate} disabled className="bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-email">Email</Label>
        <Input id="edit-email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-phone">Phone Number</Label>
        <Input id="edit-phone" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-department">Department</Label>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger id="edit-department">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engineering">Engineering</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="human resources">Human Resources</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-shift">Shift</Label>
        <Select value={shift} onValueChange={setShift}>
          <SelectTrigger id="edit-shift">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="morning-shift">Morning Shift</SelectItem>
            <SelectItem value="evening-shift">Evening Shift</SelectItem>
            <SelectItem value="night-shift">Night Shift</SelectItem>
            <SelectItem value="flexible-hours">Flexible Hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-role">Job Role</Label>
        <Input id="edit-role" value={role} onChange={e => setRole(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

