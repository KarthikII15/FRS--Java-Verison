import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  LogOut,
  Moon,
  Sun,
  User,
  Bell,
  ScanFace,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { mockAlerts } from '../../utils/mockData';

interface SidebarProps {
  title: string;
  unreadAlerts?: number;
  navigationItems?: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
  }>;
  activeTab?: string;
  onNavigate?: (value: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  title,
  unreadAlerts = 0,
  navigationItems = [],
  activeTab,
  onNavigate
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen w-64 border-r flex flex-col z-20 hidden md:flex",
      lightTheme.background.sidebar,
      lightTheme.border.default,
      "dark:bg-gray-800 dark:border-gray-700"
    )}>
      {/* Logo & Title */}
      <div className={cn("p-6 border-b", lightTheme.border.default, "dark:border-gray-700")}>
        <div className="flex items-center gap-3 mb-2">
          <div className="relative w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <ScanFace className="w-7 h-7 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
          </div>
          <div className="flex-1">
            <h1 className={cn("text-base font-bold leading-tight", lightTheme.text.primary, "dark:text-white")}>FaceAttend</h1>
            <p className={cn("text-xs font-medium", lightTheme.primary.selectedText, "dark:text-blue-400")}>
              Recognition System
            </p>
          </div>
        </div>
        <div className="mt-3 px-1 flex items-center justify-between">
          <p className={cn("text-xs capitalize", lightTheme.text.secondary, "dark:text-gray-400")}>
            {user?.role} Portal
          </p>
          <Badge className={cn("text-[10px] px-1.5 py-0.5 h-auto border-0", lightTheme.status.infoBg, lightTheme.status.info, "dark:bg-blue-900/30 dark:text-blue-300")}>
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Navigation Items */}
      {navigationItems.length > 0 && (
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;

              return (
                <button
                  key={item.value}
                  onClick={() => onNavigate?.(item.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? cn(lightTheme.sidebar.activeMenu, "dark:bg-blue-600 dark:text-white")
                      : cn(lightTheme.sidebar.inactiveMenu, "dark:text-gray-300 dark:hover:bg-gray-700")
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Bottom Actions */}
      <div className={cn("p-4 border-t space-y-3", lightTheme.border.default, "dark:border-gray-700")}>
        {/* User Info */}
        <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg", lightTheme.background.secondary, "dark:bg-gray-700/50")}>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium truncate", lightTheme.text.primary, "dark:text-white")}>{user?.name}</p>
            <p className={cn("text-xs truncate", lightTheme.text.secondary, "dark:text-gray-400")}>{user?.email}</p>
          </div>
        </div>

        {/* Notifications */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start relative text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              {unreadAlerts > 0 && (
                <Badge
                  className="ml-auto h-5 min-w-[20px] flex items-center justify-center px-1 text-xs"
                  variant="destructive"
                >
                  {unreadAlerts}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Notifications Dashboard</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4">
              {mockAlerts.length > 0 ? (
                mockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      alert.severity === 'critical' || alert.severity === 'high'
                        ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50"
                        : alert.severity === 'medium'
                          ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/50"
                          : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={cn(
                        "text-sm font-semibold",
                        alert.severity === 'critical' || alert.severity === 'high'
                          ? "text-red-800 dark:text-red-400"
                          : alert.severity === 'medium'
                            ? "text-yellow-800 dark:text-yellow-400"
                            : "text-blue-800 dark:text-blue-400"
                      )}>
                        {alert.title}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{alert.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                  No notifications at the moment.
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 mr-2" />
              Dark Mode
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 mr-2" />
              Light Mode
            </>
          )}
        </Button>

        {/* Logout Button */}
        <Button
          variant="destructive"
          size="sm"
          className="w-full justify-start"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
};
