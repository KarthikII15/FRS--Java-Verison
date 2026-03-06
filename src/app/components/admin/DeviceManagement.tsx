import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Camera,
  Cpu,
  Plus,
  Edit,
  Power,
  MapPin,
  Clock,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockDevices, Device } from '../../data/enhancedMockData';
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
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

export const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [filterType, setFilterType] = useState<'all' | 'Camera' | 'Edge Device'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Filter devices
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status.toLowerCase() === filterStatus;
    const matchesType = filterType === 'all' || device.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const onlineDevices = devices.filter(d => d.status === 'Online').length;
  const offlineDevices = devices.filter(d => d.status === 'Offline').length;

  const handleAddDevice = (newDevice: Partial<Device>) => {
    const id = `DEV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const device: Device = {
      ...newDevice,
      id,
      status: 'Online',
      lastActive: 'Just now'
    } as Device;

    setDevices(prev => [device, ...prev]);
    toast.success("Device Added", { description: `${device.name} has been securely connected.` });
    setIsAddDialogOpen(false);
  };

  const handleEditDevice = (updatedDevice: Device) => {
    setDevices(prev => prev.map(d => d.id === updatedDevice.id ? updatedDevice : d));
    toast.success("Device Updated", { description: `${updatedDevice.name} configuration saved.` });
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Online' ? 'Offline' : 'Online';
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    toast("Status Changed", { description: `Device status changed to ${newStatus}.` });
  };

  const handleViewDetails = (id: string) => {
    toast("Device Details", { description: `Opening full diagnostics for device ${id}...` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className={cn("text-xl font-semibold", lightTheme.text.primary, "dark:text-white")}>Device Management</h3>
          <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
            Monitor and manage recognition devices across all locations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Register a new recognition device to the system
              </DialogDescription>
            </DialogHeader>
            <AddDeviceForm
              onClose={() => setIsAddDialogOpen(false)}
              onAdd={handleAddDevice}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Total Devices</p>
                <p className={cn("text-2xl font-bold mt-1", lightTheme.text.primary, "dark:text-white")}>{devices.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Online</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{onlineDevices}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Power className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Offline</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{offlineDevices}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Power className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>Edge Devices</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {devices.filter(d => d.type === 'Edge Device').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Cpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search devices or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Camera">Camera</SelectItem>
                  <SelectItem value="Edge Device">Edge Device</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredDevices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onEdit={handleEditDevice}
            onToggleStatus={handleToggleStatus}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No devices found matching your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const DeviceCard: React.FC<{
  device: Device;
  onEdit: (d: Device) => void;
  onToggleStatus: (id: string, status: string) => void;
  onViewDetails: (id: string) => void;
}> = ({ device, onEdit, onToggleStatus, onViewDetails }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const DeviceIcon = device.type === 'Camera' ? Camera : Cpu;
  const isOnline = device.status === 'Online';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isOnline ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
              <DeviceIcon className={`w-6 h-6 ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                }`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{device.name}</CardTitle>
              <Badge
                variant={device.type === 'Camera' ? 'default' : 'secondary'}
                className="mt-1 text-xs"
              >
                {device.type}
              </Badge>
            </div>
          </div>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Device</DialogTitle>
                <DialogDescription>
                  Update device information
                </DialogDescription>
              </DialogHeader>
              <EditDeviceForm
                device={device}
                onClose={() => setIsEditDialogOpen(false)}
                onEdit={(d) => {
                  onEdit(d);
                  setIsEditDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center text-sm">
          <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <span className={cn("truncate", lightTheme.text.secondary, "dark:text-gray-300")}>{device.location}</span>
        </div>

        <div className="flex items-center text-sm">
          <Power className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <span className={cn(lightTheme.text.secondary, "dark:text-gray-300")}>{device.assignedPoint}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            <span className={cn(lightTheme.text.secondary, "dark:text-gray-300")}>{device.lastActive}</span>
          </div>
          <Badge variant={isOnline ? 'default' : 'destructive'} className="text-xs">
            {device.status}
          </Badge>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onViewDetails(device.id)}>
            View Details
          </Button>
          <Button
            variant={isOnline ? 'outline' : 'default'}
            size="sm"
            className="flex-1"
            onClick={() => onToggleStatus(device.id, device.status)}
          >
            <Power className="w-3 h-3 mr-1" />
            {isOnline ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AddDeviceForm: React.FC<{ onClose: () => void; onAdd: (d: Partial<Device>) => void }> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('Camera');
  const [location, setLocation] = useState('');
  const [entryPoint, setEntryPoint] = useState('');

  const handleSubmit = () => {
    if (!name || !location) {
      toast.error('Validation Error', { description: 'Device Name and Location are required.' });
      return;
    }
    onAdd({ name, type: type as any, location, assignedPoint: entryPoint });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="device-name">Device Name</Label>
        <Input id="device-name" placeholder="Enter device name" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="device-type">Device Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="device-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Camera">Camera</SelectItem>
            <SelectItem value="Edge Device">Edge Device</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" placeholder="Building / Floor / Area" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-point">Assigned Entry Point</Label>
        <Input id="entry-point" placeholder="Entry / Exit / Access Point" value={entryPoint} onChange={e => setEntryPoint(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit}>
          Add Device
        </Button>
      </div>
    </div>
  );
};

const EditDeviceForm: React.FC<{ device: Device; onClose: () => void; onEdit: (d: Device) => void }> = ({ device, onClose, onEdit }) => {
  const [name, setName] = useState(device.name);
  const [location, setLocation] = useState(device.location);
  const [entryPoint, setEntryPoint] = useState(device.assignedPoint);

  const handleSubmit = () => {
    onEdit({ ...device, name, location, assignedPoint: entryPoint });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-device-name">Device Name</Label>
        <Input id="edit-device-name" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-location">Location</Label>
        <Input id="edit-location" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-entry-point">Assigned Entry Point</Label>
        <Input id="edit-entry-point" value={entryPoint} onChange={e => setEntryPoint(e.target.value)} />
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
