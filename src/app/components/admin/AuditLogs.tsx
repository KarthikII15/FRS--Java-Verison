import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { AuditLog } from '../../types';
import { FileText, User, Clock } from 'lucide-react';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

interface AuditLogsProps {
  logs: AuditLog[];
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Audit Trail</CardTitle>
              <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
                Complete history of system activities and changes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className={cn("w-4 h-4", lightTheme.text.muted, "dark:text-gray-400")} />
                        <div>
                          <p className={cn("text-sm font-medium", lightTheme.text.primary, "dark:text-gray-200")}>
                            {new Date(log.timestamp).toLocaleDateString()}
                          </p>
                          <p className={cn("text-xs", lightTheme.text.secondary, "dark:text-gray-500")}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className={cn("w-4 h-4", lightTheme.text.muted, "dark:text-gray-400")} />
                        <span className={cn("font-medium", lightTheme.text.primary, "dark:text-gray-200")}>{log.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(lightTheme.border.default, "dark:border-gray-700")}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className={cn("text-sm truncate", lightTheme.text.primary, "dark:text-gray-300")}>
                        {log.details}
                      </p>
                    </TableCell>
                    <TableCell>
                      <code className={cn("text-xs px-2 py-1 rounded", lightTheme.background.secondary, lightTheme.text.primary, "dark:bg-gray-800")}>
                        {log.ipAddress}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className={cn("text-sm mb-2", lightTheme.text.secondary, "dark:text-gray-400")}>Total Activities</p>
              <p className={cn("text-4xl font-bold", lightTheme.text.primary, "dark:text-white")}>{logs.length}</p>
              <p className={cn("text-xs mt-2", lightTheme.text.muted, "dark:text-gray-500")}>Last 30 days</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className={cn("text-sm mb-2", lightTheme.text.secondary, "dark:text-gray-400")}>Unique Users</p>
              <p className={cn("text-4xl font-bold", lightTheme.text.primary, "dark:text-white")}>
                {new Set(logs.map(l => l.userId)).size}
              </p>
              <p className={cn("text-xs mt-2", lightTheme.text.muted, "dark:text-gray-500")}>Active administrators</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className={cn("text-sm mb-2", lightTheme.text.secondary, "dark:text-gray-400")}>Today's Activities</p>
              <p className={cn("text-4xl font-bold", lightTheme.text.primary, "dark:text-white")}>
                {logs.filter(l => {
                  const today = new Date();
                  const logDate = new Date(l.timestamp);
                  return logDate.toDateString() === today.toDateString();
                }).length}
              </p>
              <p className={cn("text-xs mt-2", lightTheme.text.muted, "dark:text-gray-500")}>System changes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

