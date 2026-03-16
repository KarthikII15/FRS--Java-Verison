import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Device } from '../../data/enhancedMockData';
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
import { useAuth } from '../../contexts/AuthContext';
import { authConfig } from '../../config/authConfig';
import { apiRequest } from '../../services/http/apiClient';

// Shape returned by /api/cameras
interface CameraDevice extends Partial<Device> {
  id: string;
  code?: string;
  name: string;
  type: 'Camera' | 'Edge Device';
  status: 'Online' | 'Offline' | 'Warning';
  location: string;
  assignedPoint: string;
  lastActive: string;
  ipAddress?: string;
  rtspUrl?: string;
  role?: string;
  fpsTarget?: number;
  siteId?: string;
}

export const DeviceManagement: React.FC = () => {
  const { accessToken } = useAuth();
  const [devices, setDevices]         = useState<Device[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [filterType, setFilterType]   = useState<'all' | 'Camera' | 'Edge Device'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // ── Fetch devices from backend API ────────────────────────────────────────
  const fetchDevices = useCallback(async () => {
    if (authConfig.mode === 'mock' || !accessToken) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await apiRequest<{ data: any[] }>('/cameras', { accessToken });
      const mapped: Device[] = (res.data || []).map((d: any) => ({
        id:               d.id,
        name:             d.name,
        type:             'Camera' as const,
        location:         d.location   || '',
        status:           normaliseStatus(d.status),
        lastActive:       d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'Unknown',
        assignedPoint:    d.role       || 'entry',
        ipAddress:        d.ipAddress  || '',
        department:       '',
        firmwareVersion:  d.firmwareVersion || '',
        eventsToday:      d.recognitionCount24h ?? 0,
        recognitionsToday: d.recognitionCount24h ?? 0,
        // camera-specific extras stored for display
        ...(d.rtspUrl    ? { rtspUrl:   d.rtspUrl }    : {}),
        ...(d.fpsTarget  ? { frameRate: d.fpsTarget }  : {}),
      }));
      setDevices(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load devices';
      setApiError(msg);
      toast.error('Device fetch failed', { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function normaliseStatus(s: string): 'Online' | 'Offline' | 'Warning' {
    if (s === 'online')  return 'Online';
    if (s === 'offline') return 'Offline';
    if (s === 'error' || s === 'maintenance') return 'Warning';
    return 'Offline';
  }

  // Filter devices
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status.toLowerCase() === filterStatus;
    const matchesType   = filterType   === 'all' || device.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const onlineDevices  = devices.filter(d => d.status === 'Online').length;
  const offlineDevices = devices.filter(d => d.status === 'Offline').length;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAddDevice = async (newDevice: {
    name: string;
    location: string;
    ipAddress?: string;
    macAddress?: string;
    firmwareVersion?: string;
    rtspUrl?: string;
    rtspMainUrl?: string;
    snapshotUrl?: string;
    rtspUsername?: string;
    rtspPassword?: string;
    channel?: number;
    rtspPort?: number;
    httpPort?: number;
    brand?: string;
    role?: string;
    fpsTarget?: number;
  }) => {
    if (authConfig.mode === 'mock') {
      const fake: Device = {
        id: `DEV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        name: newDevice.name, type: 'Camera', location: newDevice.location,
        status: 'Online', lastActive: 'Just now', assignedPoint: newDevice.role || 'entry',
        ipAddress: newDevice.ipAddress,
        macAddress: newDevice.macAddress,
        firmwareVersion: newDevice.firmwareVersion,
      } as Device;
      setDevices(prev => [fake, ...prev]);
      toast.success('Device Added', { description: `${fake.name} registered (mock mode).` });
      setIsAddDialogOpen(false);
      return;
    }
    try {
      const code = `CAM-${Date.now()}`;
      await apiRequest('/cameras', {
        method: 'POST', accessToken,
        body: JSON.stringify({ code, ...newDevice }),
      });
      toast.success('Camera Registered', { description: `${newDevice.name} is now in the system.` });
      setIsAddDialogOpen(false);
      fetchDevices();
    } catch (err) {
      toast.error('Registration failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleEditDevice = async (updatedDevice: Device) => {
    if (authConfig.mode === 'mock') {
      setDevices(prev => prev.map(d => d.id === updatedDevice.id ? updatedDevice : d));
      toast.success('Device Updated');
      return;
    }
    try {
      await apiRequest(`/cameras/${updatedDevice.id}`, {
        method: 'PUT', accessToken,
        body: JSON.stringify({
          name:      updatedDevice.name,
          location:  updatedDevice.location,
          ipAddress: updatedDevice.ipAddress,
        }),
      });
      setDevices(prev => prev.map(d => d.id === updatedDevice.id ? updatedDevice : d));
      toast.success('Device Updated', { description: `${updatedDevice.name} saved.` });
    } catch (err) {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    // Status toggle is informational only — actual camera status is driven by heartbeats
    const newStatus = currentStatus === 'Online' ? 'Offline' : 'Online';
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: newStatus as any } : d));
    toast('Status Changed', { description: `Device status set to ${newStatus}.` });
  };

  const handleTestCamera = async (id: string) => {
    try {
      const res = await apiRequest<{ reachable: boolean; message: string }>(
        `/cameras/${id}/test`, { method: 'POST', accessToken }
      );
      if (res.reachable) {
        toast.success('Camera reachable', { description: res.message });
      } else {
        toast.error('Camera unreachable', { description: res.message });
      }
    } catch (err) {
      toast.error('Test failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleViewDetails = (id: string) => {
    toast('Device Details', { description: `Opening diagnostics for device ${id}...` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className={cn("text-xl font-semibold", lightTheme.text.primary, "dark:text-white")}>Device Management</h3>
          <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
            Monitor and manage recognition cameras across all locations
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={fetchDevices} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                Add Camera
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Register New Camera</DialogTitle>
                <DialogDescription>
                  Add an IP camera or RTSP stream to the recognition system
                </DialogDescription>
              </DialogHeader>
              <AddDeviceForm
                accessToken={accessToken || ''}
                onClose={() => setIsAddDialogOpen(false)}
                onAdd={handleAddDevice}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* API error banner */}
      {apiError && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load cameras from backend</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{apiError}</p>
            </div>
          </CardContent>
        </Card>
      )}

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
            onTestCamera={handleTestCamera}
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
  onTestCamera?: (id: string) => void;
}> = ({ device, onEdit, onToggleStatus, onViewDetails, onTestCamera }) => {
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

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onViewDetails(device.id)}>
            View Details
          </Button>
          {onTestCamera && (
            <Button variant="outline" size="sm" onClick={() => onTestCamera(device.id)}>
              Test
            </Button>
          )}
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

const AddDeviceForm: React.FC<{
  accessToken: string;
  onClose: () => void;
  onAdd: (d: {
    name: string;
    location: string;
    ipAddress?: string;
    macAddress?: string;
    firmwareVersion?: string;
    rtspUrl?: string;
    rtspMainUrl?: string;
    snapshotUrl?: string;
    rtspUsername?: string;
    rtspPassword?: string;
    channel?: number;
    rtspPort?: number;
    httpPort?: number;
    brand?: string;
    role?: string;
    fpsTarget?: number;
  }) => void;
}> = ({ accessToken, onClose, onAdd }) => {
  const [name, setName]         = useState('');
  const [location, setLocation] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [firmwareVersion, setFirmwareVersion] = useState('');
  const [rtspUrl, setRtspUrl]   = useState('');
  const [rtspUsername, setRtspUsername] = useState('admin');
  const [rtspPassword, setRtspPassword] = useState('');
  const [channel, setChannel] = useState('1');
  const [rtspPort, setRtspPort] = useState('554');
  const [httpPort, setHttpPort] = useState('80');
  const [brand, setBrand] = useState('prama_hikvision');
  const [role, setRole]         = useState('entry');
  const [fpsTarget, setFpsTarget] = useState('5');
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const buildPramaRtsp = (ip: string, user: string, pass: string, ch: number, streamType: number, port: number) => {
    const channelId = ch * 100 + streamType;
    const creds = pass ? `${user}:${pass}@` : `${user}@`;
    return ip ? `rtsp://${creds}${ip}:${port}/Streaming/Channels/${channelId}` : '';
  };

  const buildPramaSnapshot = (ip: string, user: string, pass: string, ch: number, port: number) => {
    const channelId = ch * 100 + 1;
    return ip ? `http://${user}:${pass}@${ip}:${port}/ISAPI/Streaming/channels/${channelId}/picture` : '';
  };

  const handleDiscover = async () => {
    if (authConfig.mode === 'mock') {
      toast.info('Discovery not available in mock mode');
      return;
    }
    if (!ipAddress.trim()) {
      toast.error('Enter IP address first');
      return;
    }
    setIsDiscovering(true);
    try {
      const result = await apiRequest<any>('/cameras/discover', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          ipAddress: ipAddress.trim(),
          username: rtspUsername || 'admin',
          password: rtspPassword || '',
          channel:  parseInt(channel, 10) || 1,
          rtspPort: parseInt(rtspPort, 10) || 554,
          httpPort: parseInt(httpPort, 10) || 80,
        }),
      });

      if (result?.deviceInfo?.deviceName) {
        setName(result.deviceInfo.deviceName);
      }
      if (result?.deviceInfo?.firmwareVersion) {
        setFirmwareVersion(result.deviceInfo.firmwareVersion);
      }
      if (result?.deviceInfo?.macAddress) {
        setMacAddress(result.deviceInfo.macAddress);
      }

      if (result?.reachable) {
        toast.success('Camera found', {
          description: `${result.deviceInfo?.model || 'Prama camera'} detected`,
        });
      } else {
        toast.warning('Camera not responding via ISAPI', {
          description: 'Check password and HTTP port. RTSP may still work.',
        });
      }
    } catch (e) {
      toast.error('Discovery failed', {
        description: e instanceof Error ? e.message : 'Check IP and network connectivity',
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !location.trim()) {
      toast.error('Validation Error', { description: 'Camera Name and Location are required.' });
      return;
    }
    setIsSaving(true);

    const ch = parseInt(channel, 10) || 1;
    const rtspPortNum = parseInt(rtspPort, 10) || 554;
    const httpPortNum = parseInt(httpPort, 10) || 80;
    const subStreamUrl = rtspUrl.trim() ? rtspUrl.trim() : buildPramaRtsp(
      ipAddress.trim(),
      rtspUsername || 'admin',
      rtspPassword || '',
      ch,
      2,
      rtspPortNum
    );
    const mainStreamUrl = buildPramaRtsp(
      ipAddress.trim(),
      rtspUsername || 'admin',
      rtspPassword || '',
      ch,
      1,
      rtspPortNum
    );
    const snapUrl = buildPramaSnapshot(
      ipAddress.trim(),
      rtspUsername || 'admin',
      rtspPassword || '',
      ch,
      httpPortNum
    );

    await onAdd({
      name:      name.trim(),
      location:  location.trim(),
      ipAddress: ipAddress.trim() || undefined,
      macAddress: macAddress.trim() || undefined,
      firmwareVersion: firmwareVersion.trim() || undefined,
      rtspUrl:   subStreamUrl || undefined,
      rtspMainUrl: mainStreamUrl || undefined,
      snapshotUrl: snapUrl || undefined,
      rtspUsername: rtspUsername || 'admin',
      rtspPassword: rtspPassword || '',
      channel: ch,
      rtspPort: rtspPortNum,
      httpPort: httpPortNum,
      brand: brand || 'prama_hikvision',
      role,
      fpsTarget: parseInt(fpsTarget, 10) || 5,
    });
    setIsSaving(false);
  };

  const buildRtspPreview = () => {
    if (rtspUrl) return rtspUrl;
    if (ipAddress) {
      return buildPramaRtsp(
        ipAddress.trim(),
        rtspUsername || 'admin',
        '****',
        parseInt(channel, 10) || 1,
        2,
        parseInt(rtspPort, 10) || 554
      );
    }
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="dev-name">Camera Name *</Label>
          <Input id="dev-name" placeholder="e.g. Main Entrance Camera" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="dev-location">Location *</Label>
          <Input id="dev-location" placeholder="Building A / Floor 1 / Main Entrance" value={location} onChange={e => setLocation(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-ip">IP Address</Label>
          <div className="flex gap-2">
            <Input id="dev-ip" placeholder="192.168.1.101" value={ipAddress} onChange={e => setIpAddress(e.target.value)} />
            <Button variant="outline" size="sm" disabled={isDiscovering} onClick={handleDiscover}>
              <RefreshCw className={cn("w-3 h-3 mr-1", isDiscovering && "animate-spin")} />
              {isDiscovering ? 'Probing' : 'Probe'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-fps">Target FPS</Label>
          <Input id="dev-fps" type="number" min="1" max="30" value={fpsTarget} onChange={e => setFpsTarget(e.target.value)} />
          <p className="text-xs text-gray-500">5 FPS recommended for attendance</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-user">RTSP Username</Label>
          <Input id="dev-user" placeholder="admin" value={rtspUsername} onChange={e => setRtspUsername(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-pass">RTSP Password</Label>
          <Input id="dev-pass" type="password" placeholder="Camera password" value={rtspPassword} onChange={e => setRtspPassword(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-channel">Channel</Label>
          <Input id="dev-channel" type="number" min="1" max="32" value={channel} onChange={e => setChannel(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-rtsp-port">RTSP Port</Label>
          <Input id="dev-rtsp-port" type="number" min="1" max="65535" value={rtspPort} onChange={e => setRtspPort(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-http-port">HTTP Port</Label>
          <Input id="dev-http-port" type="number" min="1" max="65535" value={httpPort} onChange={e => setHttpPort(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-brand">Brand</Label>
          <Input id="dev-brand" value={brand} onChange={e => setBrand(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-mac">MAC Address</Label>
          <Input id="dev-mac" placeholder="00:1B:44:11:3A:B7" value={macAddress} onChange={e => setMacAddress(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-fw">Firmware Version</Label>
          <Input id="dev-fw" placeholder="e.g. 2.4.1" value={firmwareVersion} onChange={e => setFirmwareVersion(e.target.value)} />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="dev-rtsp">RTSP URL</Label>
          <Input
            id="dev-rtsp"
            placeholder="rtsp://admin:password@192.168.1.101:554/stream1"
            value={rtspUrl}
            onChange={e => setRtspUrl(e.target.value)}
          />
          {!rtspUrl && ipAddress && (
            <p className="text-xs text-gray-500">Preview: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{buildRtspPreview()}</code></p>
          )}
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="dev-role">Camera Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="dev-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry only</SelectItem>
              <SelectItem value="exit">Exit only</SelectItem>
              <SelectItem value="both">Entry + Exit</SelectItem>
              <SelectItem value="zone">Zone monitoring</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Registering...' : 'Register Camera'}
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
