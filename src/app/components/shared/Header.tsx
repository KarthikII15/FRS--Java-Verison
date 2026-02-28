import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'sonner';
import {
  LogOut,
  Moon,
  Sun,
  User,
  Bell,
  Settings
} from 'lucide-react';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';

interface HeaderProps {
  title: string;
  unreadAlerts?: number;
}

export const Header: React.FC<HeaderProps> = ({ title, unreadAlerts = 2 }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSettingsClick = () => {
    toast("Settings unavailable", {
      description: "User settings module is not active in this environment."
    });
  };

  return (
    <header className={cn("sticky top-0 z-10 border-b", lightTheme.background.card, lightTheme.border.default, "dark:bg-gray-800 dark:border-gray-700")}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={cn("text-2xl font-bold", lightTheme.text.primary, "dark:text-white")}>{title}</h1>
            <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
              Welcome back, {user?.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative outline-none">
                  <Bell className="w-5 h-5" />
                  {unreadAlerts > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      variant="destructive"
                    >
                      {unreadAlerts}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn("w-80", lightTheme.background.card, lightTheme.border.default, "dark:bg-gray-900 dark:border-gray-800")}>
                <DropdownMenuLabel className={cn("font-semibold", lightTheme.text.primary, "dark:text-white")}>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
                <div className="max-h-80 overflow-y-auto">
                  {/* Mock notification items */}
                  <div className={cn("px-4 py-3 cursor-pointer transition-colors border-b", lightTheme.background.hover, lightTheme.border.default, "dark:hover:bg-slate-800/50 dark:border-border/50")}>
                    <p className={cn("text-sm font-medium flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      System Update
                    </p>
                    <p className={cn("text-xs mt-1 pl-4", lightTheme.text.secondary, "dark:text-slate-400")}>Version 2.4.1 has been deployed successfully.</p>
                    <p className={cn("text-xs mt-1 pl-4", lightTheme.text.muted, "dark:text-slate-500")}>2 mins ago</p>
                  </div>
                  <div className={cn("px-4 py-3 cursor-pointer transition-colors border-b", lightTheme.background.hover, lightTheme.border.default, "dark:hover:bg-slate-800/50 dark:border-border/50")}>
                    <p className={cn("text-sm font-medium flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      High Traffic Alert
                    </p>
                    <p className={cn("text-xs mt-1 pl-4", lightTheme.text.secondary, "dark:text-slate-400")}>Unusual footfall in Area Alpha.</p>
                    <p className={cn("text-xs mt-1 pl-4", lightTheme.text.muted, "dark:text-slate-500")}>15 mins ago</p>
                  </div>
                  <div className="p-2 text-center">
                    <Button variant="ghost" className="w-full text-sm text-blue-600 dark:text-blue-400" onClick={() => {
                      toast.success("Notifications Dismissed", { description: "All notifications marked as read." });
                    }}>
                      Mark all as read
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left hidden md:block">
                    <p className={cn("text-sm font-medium", lightTheme.text.primary, "dark:text-white")}>{user?.name}</p>
                    <p className={cn("text-xs capitalize", lightTheme.text.secondary, "dark:text-gray-400")}>{user?.role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className={cn("font-medium", lightTheme.text.primary, "dark:text-white")}>{user?.name}</p>
                    <p className={cn("text-xs mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

