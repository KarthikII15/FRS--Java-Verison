import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { Shield, Users, Lock, Unlock, AlertTriangle, ArrowRight, ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react';
import { mockAreas, Area, mockDepartments, mockEmployees } from '../../../data/enhancedMockData';
import { cn } from '../../ui/utils';
import { lightTheme } from '../../../../theme/lightTheme';

// Helper to get employees for a department
const getEmployeesForDepartment = (deptName: string) => {
    return mockEmployees.filter(e => e.department === deptName);
};

// Generate mock assignments
const initialAssignments = mockAreas.map(area => ({
    areaId: area.id,
    areaName: area.name,
    type: area.type,
    // Store full department access OR specific employee access. 
    // Format: "Engineering" (full) or "Engineering:John Smith" (granular)
    allowedEntities: area.departmentOwner ? [area.departmentOwner] : [],
}));

export const AccessAssignmentManager: React.FC = () => {
    const [assignments, setAssignments] = useState(initialAssignments);
    const [selectedArea, setSelectedArea] = useState<typeof initialAssignments[0] | null>(null);
    const [expandedDept, setExpandedDept] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success("Configuration Saved", {
                description: `Access matrix for ${selectedArea?.areaName} successfully updated and applied.`
            });
        }, 1500);
    };

    const toggleEntityAccess = (entityName: string) => {
        if (!selectedArea) return;

        const updateFn = (prev: typeof assignments) => prev.map(a => {
            if (a.areaId === selectedArea.areaId) {
                const isAllowed = a.allowedEntities.includes(entityName);
                let newAllowed = [...a.allowedEntities];

                if (isAllowed) {
                    newAllowed = newAllowed.filter(e => e !== entityName);
                    // If removing a department, also remove its granular roles
                    if (!entityName.includes(':')) {
                        newAllowed = newAllowed.filter(e => !e.startsWith(`${entityName}:`));
                    }
                } else {
                    newAllowed.push(entityName);
                    // If granting full department, remove individual granular roles to clean up
                    if (!entityName.includes(':')) {
                        newAllowed = newAllowed.filter(e => !e.startsWith(`${entityName}:`));
                    }
                }

                return { ...a, allowedEntities: newAllowed };
            }
            return a;
        });

        setAssignments(updateFn);
        // Sync local selected state
        setSelectedArea(prev => prev ? updateFn([prev])[0] : prev);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={cn("text-xl font-semibold flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
                        <Shield className="w-5 h-5 text-indigo-500" />
                        Access Control Matrix
                    </h3>
                    <p className={cn("text-sm mt-1", lightTheme.text.secondary, "dark:text-gray-400")}>
                        Define which organizational departments have authorization for specific spatial zones.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Zone List */}
                <div className="lg:col-span-2 space-y-4">
                    {assignments.map(assignment => {
                        const isRestricted = assignment.type === 'Restricted' || assignment.type === 'High Security';

                        return (
                            <Card
                                key={assignment.areaId}
                                className={cn(lightTheme.background.card, "border transition-all cursor-pointer overflow-hidden dark:bg-card", selectedArea?.areaId === assignment.areaId ? "border-indigo-500" : cn(lightTheme.border.default, "dark:border-border hover:border-slate-300 dark:hover:border-slate-700"))}
                                onClick={() => setSelectedArea(assignment)}
                            >
                                <div className="flex flex-col sm:flex-row border-l-4" style={{
                                    borderLeftColor: assignment.type === 'High Security' ? '#ef4444' :
                                        assignment.type === 'Restricted' ? '#f59e0b' :
                                            assignment.type === 'Staff Only' ? '#3b82f6' : '#10b981'
                                }}>

                                    <div className="p-4 flex-grow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className={cn("text-base font-medium flex items-center gap-2", lightTheme.text.primary, "dark:text-white")}>
                                                    {isRestricted ? <Lock className="w-4 h-4 text-rose-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                                                    {assignment.areaName}
                                                </h4>
                                                <Badge className={cn("mt-1 border-none font-medium", lightTheme.background.secondary, lightTheme.text.secondary, "dark:bg-slate-800 dark:text-slate-300")}>
                                                    {assignment.type}
                                                </Badge>
                                            </div>

                                            <div className={cn("flex items-center gap-2 text-sm", lightTheme.text.secondary, "dark:text-slate-400")}>
                                                <Users className="w-4 h-4" />
                                                <span>{assignment.allowedEntities.length} Entities Configured</span>
                                                <ArrowRight className={`w-4 h-4 ml-2 transition-transform ${selectedArea?.areaId === assignment.areaId ? 'rotate-90 text-indigo-400' : ''}`} />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {assignment.allowedEntities.length > 0 ? (
                                                assignment.allowedEntities.map(entity => (
                                                    <Badge key={entity} variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                                                        {entity.includes(':') ? entity.split(':')[1] : entity}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className={cn("text-xs italic", lightTheme.text.muted, "dark:text-slate-500")}>No specific department or role restrictions applied. Open access or pending configuration.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Configuration Panel */}
                <div className="lg:col-span-1">
                    <Card className={cn("sticky top-4", lightTheme.background.card, lightTheme.border.default, "dark:bg-card dark:border-border")}>
                        <CardHeader className={cn("border-b pb-4", lightTheme.border.default, "dark:border-border/50")}>
                            <CardTitle className={cn("text-lg", lightTheme.text.primary, "dark:text-white")}>
                                {selectedArea ? 'Configure Access' : 'Select a Zone'}
                            </CardTitle>
                            <CardDescription className={cn(lightTheme.text.secondary, "dark:text-slate-400")}>
                                {selectedArea ? `Managing permissions for ${selectedArea.areaName}` : 'Click on a zone from the list to manage its department access rules.'}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-0">
                            {selectedArea ? (
                                <div className={cn("divide-y", "divide-gray-200 dark:divide-slate-800/50")}>
                                    {(selectedArea.type === 'Public') && (
                                        <div className="p-4 bg-emerald-500/10 border-l-4 border-emerald-500 text-sm text-emerald-200">
                                            This is a Public zone. The department assignments below will act as preferred occupancy tags rather than hard security restrictions.
                                        </div>
                                    )}
                                    {selectedArea.type === 'High Security' && (
                                        <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 text-sm text-rose-200 flex gap-2">
                                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                            Unauthorized tracking in this zone will immediately trigger Admin alerts on the Live Dashboard.
                                        </div>
                                    )}

                                    <div className="p-4 space-y-2">
                                        <h5 className={cn("text-xs uppercase tracking-wider font-semibold mb-3", lightTheme.text.muted, "dark:text-slate-500")}>Organizational Units & Employees</h5>
                                        {mockDepartments.map(dept => {
                                            const hasFullDeptAccess = selectedArea.allowedEntities.includes(dept.name);
                                            const employees = getEmployeesForDepartment(dept.name);
                                            const isExpanded = expandedDept === dept.name;
                                            // Calculate partial granular access
                                            const granularEmployeesCount = selectedArea.allowedEntities.filter(e => e.startsWith(`${dept.name}:`)).length;
                                            const hasPartialAccess = !hasFullDeptAccess && granularEmployeesCount > 0;

                                            return (
                                                <div key={dept.id} className="space-y-1">
                                                    <div className={cn("flex items-center justify-between p-3 rounded-lg border transition-colors",
                                                        hasFullDeptAccess ? 'bg-indigo-500/10 border-indigo-500/50' : hasPartialAccess ? 'bg-indigo-500/5 border-indigo-500/30' : cn(lightTheme.background.card, lightTheme.border.default, lightTheme.background.hover, "dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-500")
                                                    )}>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => setExpandedDept(isExpanded ? null : dept.name)}
                                                                className={cn("p-1 rounded flex items-center justify-center", lightTheme.text.secondary, lightTheme.background.hover, "dark:text-slate-400 dark:hover:bg-slate-800")}
                                                            >
                                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                            </button>
                                                            <div className="cursor-pointer" onClick={() => toggleEntityAccess(dept.name)}>
                                                                <p className={cn("text-sm font-medium", hasFullDeptAccess || hasPartialAccess ? 'text-indigo-600 dark:text-indigo-400' : cn(lightTheme.text.primary, "dark:text-slate-300"))}>
                                                                    {dept.name}
                                                                </p>
                                                                <p className={cn("text-xs mt-0.5", lightTheme.text.muted, "dark:text-slate-500")}>
                                                                    {hasPartialAccess ? `${granularEmployeesCount} specific employees authorized` : `${dept.employeeCount} Employees`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors
                                                                ${hasFullDeptAccess ? 'bg-indigo-500 border-indigo-400' : hasPartialAccess ? 'bg-indigo-500/20 border-indigo-400/50' : 'border-slate-600 hover:border-slate-400'}
                                                            `}
                                                            onClick={() => toggleEntityAccess(dept.name)}
                                                        >
                                                            {hasFullDeptAccess && <Check className="w-3 h-3 text-white" />}
                                                            {hasPartialAccess && <div className="w-2 h-0.5 bg-indigo-400" />}
                                                        </div>
                                                    </div>

                                                    {/* Granular Employee Drill-down */}
                                                    {isExpanded && employees.length > 0 && (
                                                        <div className={cn("pl-12 pr-3 py-2 space-y-2 border-l-2 ml-4", lightTheme.border.default, "dark:border-border")}>
                                                            {employees.map(employee => {
                                                                const employeeEntityId = `${dept.name}:${employee.name}`;
                                                                const hasEmployeeAccess = selectedArea.allowedEntities.includes(employeeEntityId) || hasFullDeptAccess;

                                                                return (
                                                                    <div
                                                                        key={employee.id}
                                                                        className={cn("flex items-center justify-between p-2 rounded-md border text-sm cursor-pointer transition-colors",
                                                                            hasEmployeeAccess ? 'bg-indigo-500/10 border-indigo-500/30' : cn(lightTheme.background.card, lightTheme.border.default, lightTheme.background.hover, "dark:bg-card dark:border-slate-700 dark:hover:border-slate-600")
                                                                        )}
                                                                        onClick={() => {
                                                                            // Don't allow toggling individual employees if the whole dept is authorized
                                                                            if (!hasFullDeptAccess) toggleEntityAccess(employeeEntityId);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            {employee.profileImage ? (
                                                                                <img src={employee.profileImage} alt={employee.name} className={cn("w-6 h-6 rounded-full object-cover border", lightTheme.background.secondary, lightTheme.border.default, "dark:bg-slate-800 dark:border-slate-700")} />
                                                                            ) : (
                                                                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] border", lightTheme.background.secondary, lightTheme.text.secondary, lightTheme.border.default, "dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700")}>
                                                                                    {employee.name.charAt(0)}
                                                                                </div>
                                                                            )}
                                                                            <span className={cn(hasEmployeeAccess ? 'text-indigo-600 dark:text-indigo-300' : cn(lightTheme.text.secondary, "dark:text-slate-400"))}>
                                                                                {employee.name} <span className={cn("text-xs ml-1", lightTheme.text.muted, "dark:text-slate-500")}>({employee.role})</span>
                                                                            </span>
                                                                        </div>
                                                                        <div className={cn("w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center",
                                                                            hasEmployeeAccess ? 'border-indigo-400 bg-indigo-500/20' : cn(lightTheme.border.default, "dark:border-slate-600"),
                                                                            hasFullDeptAccess ? 'opacity-50 cursor-not-allowed' : ''
                                                                        )}>
                                                                            {hasEmployeeAccess && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="p-4">
                                        <Button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                "Save Configuration"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                                    <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", lightTheme.background.secondary, "dark:bg-slate-800")}>
                                        <Shield className={cn("w-8 h-8", lightTheme.text.muted, "dark:text-slate-500")} />
                                    </div>
                                    <p className={cn("text-sm", lightTheme.text.secondary, "dark:text-slate-400")}>Zone configuration panel inactive.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

