import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { FilterOptions } from '../../types';
import { departments, locations } from '../../utils/mockData';
import { cn } from '../ui/utils';
import { lightTheme } from '../../../theme/lightTheme';

interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFiltersChange }) => {
  const handleDepartmentToggle = (dept: string) => {
    const newDepts = filters.departments.includes(dept)
      ? filters.departments.filter(d => d !== dept)
      : [...filters.departments, dept];
    onFiltersChange({ ...filters, departments: newDepts });
  };

  const handleLocationToggle = (loc: string) => {
    const newLocs = filters.locations.includes(loc)
      ? filters.locations.filter(l => l !== loc)
      : [...filters.locations, loc];
    onFiltersChange({ ...filters, locations: newLocs });
  };

  const handleStatusToggle = (status: any) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      departments: [],
      locations: [],
      status: [],
    });
  };

  const hasActiveFilters =
    filters.departments.length > 0 ||
    filters.locations.length > 0 ||
    filters.status.length > 0;

  return (
    <Card className={cn("mb-6", lightTheme.background.card, lightTheme.border.default, "dark:bg-slate-900 dark:border-border")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(lightTheme.text.primary, "dark:text-white")}>Advanced Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.start.toLocaleDateString()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.start}
                  onSelect={(date) => date && onFiltersChange({
                    ...filters,
                    dateRange: { ...filters.dateRange, start: date }
                  })}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.end.toLocaleDateString()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.end}
                  onSelect={(date) => date && onFiltersChange({
                    ...filters,
                    dateRange: { ...filters.dateRange, end: date }
                  })}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Departments */}
          <div className="space-y-3">
            <Label>Departments</Label>
            {departments.map(dept => (
              <div key={dept} className="flex items-center space-x-2">
                <Checkbox
                  id={`dept-${dept}`}
                  checked={filters.departments.includes(dept)}
                  onCheckedChange={() => handleDepartmentToggle(dept)}
                />
                <label
                  htmlFor={`dept-${dept}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {dept}
                </label>
              </div>
            ))}
          </div>

          {/* Locations */}
          <div className="space-y-3">
            <Label>Locations</Label>
            {locations.map(loc => (
              <div key={loc} className="flex items-center space-x-2">
                <Checkbox
                  id={`loc-${loc}`}
                  checked={filters.locations.includes(loc)}
                  onCheckedChange={() => handleLocationToggle(loc)}
                />
                <label
                  htmlFor={`loc-${loc}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {loc}
                </label>
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="space-y-3">
            <Label>Status</Label>
            {['present', 'late', 'absent', 'on-leave'].map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.status.includes(status as any)}
                  onCheckedChange={() => handleStatusToggle(status)}
                />
                <label
                  htmlFor={`status-${status}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                >
                  {status.replace('-', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

