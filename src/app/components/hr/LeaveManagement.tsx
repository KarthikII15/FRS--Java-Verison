import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Calendar,
  Plus,
  Check,
  X,
  Clock,
  Filter,
  Download,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockLeaveRequests, LeaveRequest } from '../../data/enhancedMockData';
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

export const LeaveManagement: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(mockLeaveRequests);
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredRequests = filterStatus === 'all'
    ? leaveRequests
    : leaveRequests.filter(req => req.status === filterStatus);

  const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;

  const handleApprove = (id: string) => {
    setLeaveRequests(prev =>
      prev.map(req => {
        if (req.id === id) {
          toast.success("Leave Approved", { description: `${req.employeeName}'s leave request has been approved.` });
          return { ...req, status: 'Approved' as const };
        }
        return req;
      })
    );
  };

  const handleReject = (id: string) => {
    setLeaveRequests(prev =>
      prev.map(req => {
        if (req.id === id) {
          toast.success("Leave Rejected", { description: `${req.employeeName}'s leave request has been rejected.` });
          return { ...req, status: 'Rejected' as const };
        }
        return req;
      })
    );
  };

  const handleAddLeave = (leaveData: any) => {
    const newLeave: LeaveRequest = {
      id: `LR-${Math.floor(Math.random() * 10000)}`,
      employeeId: leaveData.employeeId,
      employeeName: leaveData.employeeName,
      department: 'Engineering', // mock
      leaveType: leaveData.leaveType,
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      days: 2, // mock calculation
      reason: leaveData.reason,
      status: 'Pending',
      appliedDate: new Date().toISOString().split('T')[0]
    };

    setLeaveRequests(prev => [newLeave, ...prev]);
    toast.success("Leave Request Created", { description: `Leave request for ${newLeave.employeeName} submitted successfully.` });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">


      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", filterStatus === 'Pending' ? 'ring-2 ring-yellow-500' : '')}
          onClick={() => setFilterStatus(filterStatus === 'Pending' ? 'all' : 'Pending')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", filterStatus === 'Approved' ? 'ring-2 ring-green-500' : '')}
          onClick={() => setFilterStatus(filterStatus === 'Approved' ? 'all' : 'Approved')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Approved</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{approvedCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border cursor-pointer transition-all hover:shadow-lg", filterStatus === 'Rejected' ? 'ring-2 ring-red-500' : '')}
          onClick={() => setFilterStatus(filterStatus === 'Rejected' ? 'all' : 'Rejected')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Rejected</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{rejectedCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests List */}
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>
              {filterStatus === 'all' ? 'All Leave Requests' : `${filterStatus} Requests`}
            </CardTitle>
            {filterStatus !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')}>
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <LeaveRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}

            {filteredRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No leave requests found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const LeaveRequestCard: React.FC<{
  request: LeaveRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ request, onApprove, onReject }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return cn(lightTheme.status.successBg, lightTheme.status.success, "dark:bg-green-900/20 dark:text-green-300");
      case 'Rejected':
        return cn(lightTheme.status.errorBg, lightTheme.status.error, "dark:bg-red-900/20 dark:text-red-300");
      case 'Pending':
        return cn(lightTheme.status.warningBg, lightTheme.status.warning, "dark:bg-yellow-900/20 dark:text-yellow-300");
      default:
        return cn(lightTheme.background.secondary, lightTheme.text.muted, "dark:bg-gray-800 dark:text-gray-300");
    }
  };

  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg hover:shadow-md transition-shadow gap-4", lightTheme.background.secondary, "dark:bg-gray-800/50")}>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <p className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{request.employeeName}</p>
          <Badge variant="secondary" className="text-xs">{request.department}</Badge>
          <Badge className={`${getStatusColor(request.status)} text-xs`}>
            {request.status}
          </Badge>
        </div>

        <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm", lightTheme.text.secondary, "dark:text-gray-300")}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{request.startDate} to {request.endDate}</span>
          </div>
          <div>
            <span className="font-medium">{request.days} day{request.days > 1 ? 's' : ''}</span>
            <span className="mx-2">•</span>
            <span>{request.leaveType}</span>
          </div>
        </div>

        <p className={cn("text-sm mt-2", lightTheme.text.secondary, "dark:text-gray-400")}>
          <span className={cn("font-medium", lightTheme.text.primary, "dark:text-gray-200")}>Reason:</span> {request.reason}
        </p>

        <p className={cn("text-xs mt-1", lightTheme.text.muted, "dark:text-gray-500")}>
          Applied on {request.appliedDate}
        </p>
      </div>

      {request.status === 'Pending' && (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onApprove(request.id)}
            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(request.id)}
            className="flex-1 md:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
};

const AddLeaveForm: React.FC<{ onClose: () => void; onAdd: (d: any) => void }> = ({ onClose, onAdd }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const employeeMap: Record<string, string> = {
    'emp1': 'John Smith',
    'emp2': 'Sarah Johnson',
    'emp3': 'Michael Chen'
  };

  const handleSubmit = () => {
    if (!employeeId || !leaveType || !startDate || !endDate) {
      toast.error('Validation Error', { description: 'Please fill in all required fields.' });
      return;
    }

    onAdd({
      employeeId,
      employeeName: employeeMap[employeeId] || 'Unknown Employee',
      leaveType: leaveType.charAt(0).toUpperCase() + leaveType.slice(1),
      startDate,
      endDate,
      reason
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="employee-select">Employee</Label>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger id="employee-select">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="emp1">John Smith</SelectItem>
            <SelectItem value="emp2">Sarah Johnson</SelectItem>
            <SelectItem value="emp3">Michael Chen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="leave-type">Leave Type</Label>
        <Select value={leaveType} onValueChange={setLeaveType}>
          <SelectTrigger id="leave-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sick">Sick Leave</SelectItem>
            <SelectItem value="vacation">Vacation</SelectItem>
            <SelectItem value="personal">Personal Leave</SelectItem>
            <SelectItem value="emergency">Emergency Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Input id="reason" placeholder="Brief reason for leave" value={reason} onChange={e => setReason(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit}>
          Mark Leave
        </Button>
      </div>
    </div>
  );
};

