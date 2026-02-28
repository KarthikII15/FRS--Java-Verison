import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  LogOut,
  Moon,
  Sun,
  User,
  Bell,
  ScanFace,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { mockAlerts } from '../../utils/mockData';

interface MobileNavProps {
  title: string;
  unreadAlerts?: number;
  navigationItems: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
  }>;
  activeTab: string;
  onNavigate: (value: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  title,
  unreadAlerts = 0,
  navigationItems,
  activeTab,
  onNavigate
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigate = (value: string) => {
    onNavigate(value);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className={cn("md:hidden fixed top-0 left-0 right-0 h-16 border-b px-4 flex items-center justify-between z-30", lightTheme.background.card, lightTheme.border.default, "dark:bg-gray-800 dark:border-gray-700")}>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <ScanFace className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
          </div>
          <div>
            <h1 className={cn("text-sm font-bold", lightTheme.text.primary, "dark:text-white")}>FaceAttend</h1>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {user?.role} Portal
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20 mt-16"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className={cn("w-full max-w-sm ml-auto h-full shadow-xl overflow-y-auto", lightTheme.background.card, "dark:bg-gray-800")}
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info */}
            <div className={cn("p-4 border-b", lightTheme.border.default, "dark:border-gray-700")}>
              <div className={cn("flex items-center gap-3 p-3 rounded-lg", lightTheme.background.secondary, "dark:bg-gray-700/50")}>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", lightTheme.text.primary, "dark:text-white")}>{user?.name}</p>
                  <p className={cn("text-xs truncate", lightTheme.text.secondary, "dark:text-gray-400")}>{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-4">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value;

                  return (
                    <button
                      key={item.value}
                      onClick={() => handleNavigate(item.value)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-blue-600 text-white"
                          : cn(lightTheme.text.secondary, lightTheme.background.hover, "dark:text-gray-300 dark:hover:bg-gray-700")
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Actions */}
            <div className={cn("p-4 border-t space-y-3", lightTheme.border.default, "dark:border-gray-700")}>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start relative"
                    onClick={() => setIsMenuOpen(false)}
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
                <SheetContent side="right" className="w-[85vw] sm:w-[540px] overflow-y-auto">
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

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
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
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile (Alternative) */}
      <div className={cn("md:hidden fixed bottom-0 left-0 right-0 border-t z-30 hidden", lightTheme.background.card, lightTheme.border.default, "dark:bg-gray-800 dark:border-gray-700")}>
        <div className="flex items-center justify-around p-2">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.value;

            return (
              <button
                key={item.value}
                onClick={() => onNavigate(item.value)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : cn(lightTheme.text.secondary, "dark:text-gray-400")
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
