import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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
import { User, Employee } from '../../types';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import { MetricCard } from '../shared/MetricCard';
import { Users, UserPlus, Edit, Trash2, Shield, Search, UserCheck, Clock } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  employees: Employee[];
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, employees }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'hr' as 'admin' | 'hr',
    department: '',
  });

  const [localUsers, setLocalUsers] = useState<User[]>(users);

  const filteredUsers = localUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Validation Error", { description: "Name, email and password are required." });
      return;
    }

    const createdUser: User = {
      id: `USR-${Math.floor(Math.random() * 10000)}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      createdAt: (new Date().toISOString() as any),
      password: newUser.password
    };

    setLocalUsers(prev => [createdUser, ...prev]);
    toast.success("User Created", { description: `${newUser.name} has been added as a ${newUser.role}.` });

    setIsCreateDialogOpen(false);
    setNewUser({
      email: '',
      password: '',
      name: '',
      role: 'hr',
      department: '',
    });
  };

  const handleDeleteUser = (id: string, name: string) => {
    setLocalUsers(prev => prev.filter(u => u.id !== id));
    toast.success("User Removed", { description: `${name} has been successfully removed from the system.` });
  };

  const handleEditClick = (user: User) => {
    toast("Edit User", { description: `Opening user editor for ${user.name}...` });
  };

  return (
    <div className="space-y-6">
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>User Management</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Create New User</DialogTitle>
                  <DialogDescription className={cn(lightTheme.text.secondary, "dark:text-slate-400")}>
                    Add a new user to the system with appropriate role and permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="********"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: 'admin' | 'hr') => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hr">HR User</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newUser.department}
                      onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                      placeholder="Human Resources"
                    />
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("pl-10", lightTheme.background.primary, lightTheme.border.input, lightTheme.text.primary, "dark:bg-input-background dark:border-border dark:text-foreground")}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Registration Status */}
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
        <CardHeader>
          <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Employee Registration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              title="Registered Employees"
              value={employees.length}
              icon={UserCheck}
              description="Face recognition enrolled"
              colorClass="text-emerald-500"
            />
            <MetricCard
              title="Pending Enrollment"
              value={0}
              icon={Clock}
              description="Awaiting registration"
              colorClass="text-amber-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
        <CardHeader>
          <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Permission</th>
                  <th className="text-center p-3 font-medium">Admin</th>
                  <th className="text-center p-3 font-medium">HR User</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'User Management', admin: true, hr: false },
                  { name: 'View Attendance', admin: true, hr: true },
                  { name: 'Export Reports', admin: true, hr: true },
                  { name: 'Device Management', admin: true, hr: false },
                  { name: 'System Configuration', admin: true, hr: false },
                  { name: 'View Analytics', admin: true, hr: true },
                  { name: 'Audit Logs', admin: true, hr: false },
                ].map((perm, index) => (
                  <tr key={index} className={cn("border-b", lightTheme.border.default, lightTheme.text.secondary, "hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:border-border dark:text-slate-300")}>
                    <td className="p-3">{perm.name}</td>
                    <td className="text-center p-3">
                      {perm.admin ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">No</Badge>
                      )}
                    </td>
                    <td className="text-center p-3">
                      {perm.hr ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">No</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



