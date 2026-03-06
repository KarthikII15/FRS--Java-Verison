import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Building2,
  Clock,
  Plus,
  Edit,
  Users,
  Calendar,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockDepartments, mockShifts, mockEmployees, Department, Shift, Employee } from '../../data/enhancedMockData';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';

export const DepartmentShiftManagement: React.FC = () => {
  return (
    <div className="space-y-6">


      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-6">
          <DepartmentManagement />
        </TabsContent>

        <TabsContent value="shifts" className="mt-6">
          <ShiftManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>(mockDepartments);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddDepartment = (dept: Partial<Department>) => {
    const newDept: Department = {
      id: `DEPT-${Math.floor(Math.random() * 1000)}`,
      name: dept.name!,
      code: dept.code!,
      hrOwner: dept.hrOwner || 'Unassigned',
      employeeCount: 0,
      color: '#3b82f6', // default color
    };
    setDepartments(prev => [...prev, newDept]);
    toast.success("Department Created", { description: `${newDept.name} has been successfully created.` });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h4 className={cn("text-lg font-medium", lightTheme.text.primary, "dark:text-white")}>Department Structure</h4>
          <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
            Manage organizational departments
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>
                Add a new department to your organization
              </DialogDescription>
            </DialogHeader>
            <AddDepartmentForm
              onClose={() => setIsAddDialogOpen(false)}
              onAdd={handleAddDepartment}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <DepartmentCard key={dept.id} department={dept} />
        ))}
      </div>
    </div>
  );
};

const DepartmentCard: React.FC<{ department: Department }> = ({ department }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <Card className={cn("hover:shadow-lg transition-shadow", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: department.color + '20' }}
            >
              <Building2 className="w-6 h-6" style={{ color: department.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{department.name}</CardTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                {department.code}
              </Badge>
            </div>
          </div>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Department</DialogTitle>
              </DialogHeader>
              <EditDepartmentForm department={department} onClose={() => setIsEditDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>HR Owner</span>
          <span className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{department.hrOwner}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={cn(lightTheme.text.secondary, "dark:text-gray-400")}>Employees</span>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{department.employeeCount}</span>
          </div>
        </div>

        <div className={cn("pt-3 border-t", lightTheme.border.default, "dark:border-gray-700")}>
          <Button variant="outline" size="sm" className="w-full">
            View Team
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ShiftManagement: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddShift = (shift: Partial<Shift>) => {
    const newShift: Shift = {
      id: `SHF-${Math.floor(Math.random() * 1000)}`,
      name: shift.name!,
      timeIn: shift.timeIn!,
      timeOut: shift.timeOut!,
      gracePeriod: shift.gracePeriod || 15,
      assignedCount: 0,
      color: '#3b82f6',
    };
    setShifts(prev => [...prev, newShift]);
    toast.success("Shift Created", { description: `${newShift.name} is now available for assignment.` });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h4 className={cn("text-lg font-medium", lightTheme.text.primary, "dark:text-white")}>Shift Configuration</h4>
          <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
            Define work schedules and timings
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Shift</DialogTitle>
              <DialogDescription>
                Define a new work shift schedule
              </DialogDescription>
            </DialogHeader>
            <AddShiftForm
              onClose={() => setIsAddDialogOpen(false)}
              onAdd={handleAddShift}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map((shift) => (
          <ShiftCard key={shift.id} shift={shift} />
        ))}
      </div>

      {/* Weekly Roster Preview */}
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
            <Calendar className="w-5 h-5" />
            Weekly Roster Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("text-center py-8", lightTheme.text.secondary, "dark:text-gray-400")}>
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Roster Board Coming Soon</p>
            <p className="text-sm mt-1">Drag-and-drop shift assignment interface</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ShiftCard: React.FC<{ shift: Shift }> = ({ shift }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);

  return (
    <Card className="hover:shadow-lg transition-transform duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300"
              style={{
                backgroundColor: shift.color,
                boxShadow: `0 8px 16px -4px ${shift.color}40`,
              }}
            >
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className={cn("text-lg font-bold", lightTheme.text.primary, "dark:text-white")}>
                {shift.name}
              </CardTitle>
              <div className={cn("flex items-center gap-1.5 mt-1", lightTheme.text.secondary, "dark:text-slate-400")}>
                <Timer className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">
                  {shift.timeIn} - {shift.timeOut}
                </span>
              </div>
            </div>
          </div>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(lightTheme.text.secondary, "hover:text-current dark:text-slate-500 dark:hover:text-white dark:hover:bg-slate-800")}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Shift</DialogTitle>
              </DialogHeader>
              <EditShiftForm
                shift={shift}
                onClose={() => setIsEditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className={cn("p-3 rounded-xl border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border/50")}>
            <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", lightTheme.text.muted, "dark:text-slate-500")}>
              Duration
            </p>
            <p className={cn("text-sm font-bold", lightTheme.text.primary, "dark:text-white")}>9 Hours</p>
          </div>
          <div className={cn("p-3 rounded-xl border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border/50")}>
            <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", lightTheme.text.muted, "dark:text-slate-500")}>
              Grace Period
            </p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500">15 Mins</p>
          </div>
        </div>

        <div className={cn("flex items-center justify-between text-sm py-2 px-3 rounded-xl border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border/50")}>
          <span className={cn("font-medium", lightTheme.text.secondary, "dark:text-slate-400")}>Assigned Employees</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-4.5 h-4.5 text-blue-500" />
            <span className={cn("font-bold text-base", lightTheme.text.primary, "dark:text-white")}>
              {shift.assignedCount}
            </span>
          </div>
        </div>

        <div className="pt-2 flex gap-3">

          <Button
            variant="outline"
            size="sm"
            className={cn("flex-1", lightTheme.border.default, lightTheme.text.secondary, "dark:border-border dark:hover:bg-slate-800 dark:text-slate-300")}
          >
            View Schedule
          </Button>
          <Dialog open={isAssignStaffOpen} onOpenChange={setIsAssignStaffOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className={cn("flex-1 bg-blue-600 hover:bg-blue-500", "text-white")}>
                Assign Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Staff to {shift.name}</DialogTitle>
                <DialogDescription className={cn(lightTheme.text.muted, "dark:text-slate-400")}>
                  Select employees to assign to the {shift.timeIn} -{" "}
                  {shift.timeOut} schedule.
                </DialogDescription>
              </DialogHeader>
              <AssignStaffList
                shift={shift}
                onClose={() => setIsAssignStaffOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

const AssignStaffList: React.FC<{ shift: Shift; onClose: () => void }> = ({
  shift,
  onClose,
}) => {
  const [selectedEmps, setSelectedEmps] = useState<string[]>(
    mockEmployees
      .filter((e: Employee) => e.shift === shift.name)
      .map((e: Employee) => e.employeeId),
  );


  const toggleEmployee = (empId: string) => {
    setSelectedEmps((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    );
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {mockEmployees.map((emp: Employee) => (
          <div

            key={emp.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
              selectedEmps.includes(emp.employeeId)
                ? "bg-blue-600/10 border-blue-500/50"
                : cn(lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-900/50 dark:border-border/50 hover:border-slate-700"),
            )}
            onClick={() => toggleEmployee(emp.employeeId)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-500 font-bold border border-slate-700">
                {emp.name.charAt(0)}
              </div>
              <div>
                <p className={cn("font-semibold", lightTheme.text.primary, "dark:text-white")}>{emp.name}</p>
                <p className={cn("text-xs", lightTheme.text.secondary, "dark:text-slate-500")}>{emp.department} • {emp.role}</p>
              </div>
            </div>
            <div
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                selectedEmps.includes(emp.employeeId)
                  ? "bg-blue-600 border-blue-600"
                  : cn(lightTheme.border.default, "dark:border-slate-700"),
              )}
            >
              {selectedEmps.includes(emp.employeeId) && (
                <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45 mb-0.5" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-800">
        <Button variant="outline" className="flex-1 border-slate-800" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-500"
          onClick={() => {
            toast.success("Assignments Updated", { description: `Successfully assigned ${selectedEmps.length} employees to ${shift.name}.` });
            onClose();
          }}
        >
          Update Assignments ({selectedEmps.length})
        </Button>
      </div>
    </div>
  );
};


// Form Components
const AddDepartmentForm: React.FC<{ onClose: () => void; onAdd: (d: Partial<Department>) => void }> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hrOwner, setHrOwner] = useState('');

  const handleSubmit = () => {
    if (!name || !code) {
      toast.error('Validation Error', { description: 'Department Name and Code are required.' });
      return;
    }
    onAdd({ name, code, hrOwner });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dept-name">Department Name</Label>
        <Input id="dept-name" placeholder="e.g., Engineering" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dept-code">Department Code</Label>
        <Input id="dept-code" placeholder="e.g., ENG" value={code} onChange={e => setCode(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hr-owner">HR Owner</Label>
        <Input id="hr-owner" placeholder="Responsible HR manager" value={hrOwner} onChange={e => setHrOwner(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit}>
          Create Department
        </Button>
      </div>
    </div>
  );
};

const EditDepartmentForm: React.FC<{ department: Department; onClose: () => void }> = ({ department, onClose }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-dept-name">Department Name</Label>
        <Input id="edit-dept-name" defaultValue={department.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-dept-code">Department Code</Label>
        <Input id="edit-dept-code" defaultValue={department.code} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-hr-owner">HR Owner</Label>
        <Input id="edit-hr-owner" defaultValue={department.hrOwner} />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

const AddShiftForm: React.FC<{ onClose: () => void; onAdd: (s: Partial<Shift>) => void }> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [gracePeriod, setGracePeriod] = useState(15);

  const handleSubmit = () => {
    if (!name || !timeIn || !timeOut) {
      toast.error('Validation Error', { description: 'Shift Name, Start Time, and End Time are required.' });
      return;
    }
    // format times
    const formatTime = (t: string) => {
      const [h, m] = t.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${formattedHour}:${m} ${ampm}`;
    };

    onAdd({
      name,
      timeIn: formatTime(timeIn),
      timeOut: formatTime(timeOut),
      gracePeriod
    });
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="shift-name">Shift Name</Label>
        <Input id="shift-name" placeholder="e.g., Morning Shift" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="time-in">Start Time</Label>
          <Input id="time-in" type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time-out">End Time</Label>
          <Input id="time-out" type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="grace-period">Grace Period (Minutes)</Label>
        <Input id="grace-period" type="number" placeholder="e.g., 15" value={gracePeriod} onChange={e => setGracePeriod(Number(e.target.value))} />
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className={cn("flex-1 bg-blue-600 hover:bg-blue-500", "text-white")} onClick={handleSubmit}>
          Create Shift
        </Button>
      </div>
    </div>
  );
};

const EditShiftForm: React.FC<{ shift: Shift; onClose: () => void }> = ({ shift, onClose }) => {
  // Helper to convert AM/PM string to 24-hour HH:mm
  const formatTo24h = (timeStr: string) => {
    if (!timeStr || timeStr === 'Flexible') return '';
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString().padStart(2, '0');
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="edit-shift-name">Shift Name</Label>
        <Input id="edit-shift-name" defaultValue={shift.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-time-in">Start Time</Label>
          <Input
            id="edit-time-in"
            type="time"
            defaultValue={formatTo24h(shift.timeIn)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-time-out">End Time</Label>
          <Input
            id="edit-time-out"
            type="time"
            defaultValue={formatTo24h(shift.timeOut)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-grace-period">Grace Period (Minutes)</Label>
        <Input id="edit-grace-period" type="number" defaultValue={15} />
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className={cn("flex-1 bg-blue-600 hover:bg-blue-500", "text-white")} onClick={onClose}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};


