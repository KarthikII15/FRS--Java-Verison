import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Search, X } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Button } from '../ui/button';

interface SearchResult {
  id: string;
  type: 'employee' | 'department' | 'shift';
  title: string;
  subtitle: string;
  status?: string;
}

export const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock search results
  const mockResults: SearchResult[] = [
    { id: '1', type: 'employee', title: 'John Smith', subtitle: 'Engineering • Present', status: 'Present' },
    { id: '2', type: 'employee', title: 'Sarah Johnson', subtitle: 'HR • Present', status: 'Present' },
    { id: '3', type: 'employee', title: 'Emily Davis', subtitle: 'Marketing • On Leave', status: 'On Leave' },
    { id: '4', type: 'department', title: 'Engineering', subtitle: '45 employees' },
    { id: '5', type: 'shift', title: 'Morning Shift', subtitle: '08:00 AM - 05:00 PM' },
  ];

  const filteredResults = searchQuery
    ? mockResults.filter(
      result =>
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  return (
    <>
      <Button
        variant="outline"
        className={cn("relative w-full justify-start", lightTheme.text.secondary, "dark:text-gray-400")}
        onClick={() => setOpen(true)}
      >
        <Search className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Search employees, departments, shifts...</span>
        <span className="sm:hidden">Search...</span>
        <kbd className={cn("hidden md:inline-flex pointer-events-none absolute right-2 h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100", lightTheme.background.secondary, lightTheme.border.default, lightTheme.text.secondary, "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300")}>
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search employees, departments, shifts..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {filteredResults.length === 0 && searchQuery && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {filteredResults.length > 0 && (
            <CommandGroup heading="Results">
              {filteredResults.map(result => (
                <CommandItem key={result.id} onSelect={() => setOpen(false)}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <p className="font-medium">{result.title}</p>
                      <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-gray-400")}>{result.subtitle}</p>
                    </div>
                    {result.status && (
                      <Badge
                        variant={
                          result.status === 'Present'
                            ? 'default'
                            : result.status === 'On Leave'
                              ? 'secondary'
                              : 'outline'
                        }
                        className="text-xs"
                      >
                        {result.status}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
