import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Settings, Loader2 } from 'lucide-react';
import { leaveRuleApi, leaveRulePhaseApi, employeeTypeApi } from '@/lib/api';
import type { LeaveRule, LeaveRulePhase } from '@shared/schema';
import { useToast } from "@/hooks/use-toast";

export default function LeaveRulesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: leaveRules = [] } = useQuery({
    queryKey: ['leaveRules'],
    queryFn: leaveRuleApi.getAll,
  });

  const { data: employeeTypes = [] } = useQuery({
    queryKey: ['employeeTypes'],
    queryFn: employeeTypeApi.getAll,
  });

  // State
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Partial<LeaveRule>>({});
  const [isEditingRule, setIsEditingRule] = useState(false);
  
  const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false);
  const [currentPhaseRule, setCurrentPhaseRule] = useState<LeaveRule | null>(null);
  const [phases, setPhases] = useState<LeaveRulePhase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: leaveRuleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRules'] });
      toast({ title: "Leave Rule Created", description: "Leave rule has been added successfully." });
      setIsRuleDialogOpen(false);
      setCurrentRule({});
      setIsEditingRule(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => leaveRuleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRules'] });
      toast({ title: "Leave Rule Updated", description: "Leave rule has been updated successfully." });
      setIsRuleDialogOpen(false);
      setCurrentRule({});
      setIsEditingRule(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: leaveRuleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRules'] });
      toast({ title: "Leave Rule Deleted", description: "Leave rule has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Handlers
  const handleSaveRule = () => {
    if (!currentRule.name || !currentRule.leaveType) {
      toast({ variant: "destructive", title: "Error", description: "Rule name and leave type are required" });
      return;
    }

    if (isEditingRule && currentRule.id) {
      updateRuleMutation.mutate({
        id: currentRule.id,
        name: currentRule.name,
        leaveType: currentRule.leaveType,
        description: currentRule.description || null,
        employeeTypeId: currentRule.employeeTypeId || null,
        accrualType: currentRule.accrualType || 'fixed',
        accrualRate: currentRule.accrualRate || null,
        daysEarned: currentRule.daysEarned || '1',
        periodDaysWorked: currentRule.periodDaysWorked || null,
        maxAccrual: currentRule.maxAccrual || null,
        waitingPeriodDays: currentRule.waitingPeriodDays || null,
        cycleMonths: currentRule.cycleMonths || null,
        notes: currentRule.notes || null,
      });
    } else {
      createRuleMutation.mutate({
        name: currentRule.name,
        leaveType: currentRule.leaveType,
        description: currentRule.description || undefined,
        employeeTypeId: currentRule.employeeTypeId || undefined,
        accrualType: currentRule.accrualType || 'fixed',
        accrualRate: currentRule.accrualRate || undefined,
        daysEarned: currentRule.daysEarned || '1',
        periodDaysWorked: currentRule.periodDaysWorked || undefined,
        maxAccrual: currentRule.maxAccrual || undefined,
        waitingPeriodDays: currentRule.waitingPeriodDays || undefined,
        cycleMonths: currentRule.cycleMonths || undefined,
        notes: currentRule.notes || undefined,
      });
    }
  };

  const handleOpenEditRule = (rule: LeaveRule) => {
    setCurrentRule(rule);
    setIsEditingRule(true);
    setIsRuleDialogOpen(true);
  };

  const handleOpenCreateRule = () => {
    setCurrentRule({ accrualType: 'fixed' });
    setIsEditingRule(false);
    setIsRuleDialogOpen(true);
  };

  const handleDeleteRule = (id: number) => {
    if (confirm('Are you sure you want to delete this leave rule?')) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleOpenPhaseEditor = async (rule: LeaveRule) => {
    setCurrentPhaseRule(rule);
    setLoadingPhases(true);
    setIsPhaseDialogOpen(true);
    try {
      const rulePhases = await leaveRulePhaseApi.getByRuleId(rule.id);
      setPhases(rulePhases);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load phases", variant: "destructive" });
      setPhases([]);
    } finally {
      setLoadingPhases(false);
    }
  };

  const handleAddPhase = () => {
    const newPhase: Partial<LeaveRulePhase> = {
      phaseName: `Phase ${phases.length + 1}`,
      sequence: phases.length + 1,
      accrualType: 'per_days_worked',
      daysEarned: '1',
      periodDaysWorked: 26,
      startsAfterMonths: phases.length > 0 ? (phases[phases.length - 1].startsAfterMonths || 0) + 6 : 0,
      startsAfterDaysWorked: null,
      maxBalanceDays: null,
    };
    setPhases([...phases, newPhase as LeaveRulePhase]);
  };

  const handleUpdatePhase = (index: number, updates: Partial<LeaveRulePhase>) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], ...updates };
    setPhases(newPhases);
  };

  const handleRemovePhase = (index: number) => {
    const newPhases = phases.filter((_, i) => i !== index);
    // Re-sequence
    newPhases.forEach((phase, i) => {
      phase.sequence = i + 1;
    });
    setPhases(newPhases);
  };

  const handleSavePhases = async () => {
    if (!currentPhaseRule) return;
    
    try {
      // Delete all existing phases
      await leaveRulePhaseApi.deleteAll(currentPhaseRule.id);
      
      // Create new phases
      for (const phase of phases) {
        await leaveRulePhaseApi.create(currentPhaseRule.id, {
          phaseName: phase.phaseName,
          sequence: phase.sequence,
          accrualType: phase.accrualType,
          daysEarned: phase.daysEarned,
          periodDaysWorked: phase.periodDaysWorked,
          startsAfterMonths: phase.startsAfterMonths,
          startsAfterDaysWorked: phase.startsAfterDaysWorked,
          maxBalanceDays: phase.maxBalanceDays,
          cycleMonths: phase.cycleMonths,
          notes: phase.notes,
        });
      }
      
      toast({ title: "Success", description: "Phases saved successfully" });
      setIsPhaseDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save phases", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Leave Rules</h1>
          <p className="text-muted-foreground">Configure leave accrual and entitlement rules</p>
        </div>
        <Button onClick={handleOpenCreateRule} data-testid="button-create-rule">
          <Plus className="h-4 w-4 mr-2" /> Add Leave Rule
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Leave Accrual Rules</CardTitle>
          <CardDescription>Define how leave is accrued for different employee types and leave types</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Employee Type</TableHead>
                <TableHead>Accrual Type</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Max Accrual</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRules.map((rule) => {
                const empType = employeeTypes.find(t => t.id === rule.employeeTypeId);
                const getFormulaDisplay = () => {
                  if (rule.accrualType === 'days_worked' && rule.daysEarned && rule.periodDaysWorked) {
                    return `${rule.daysEarned} day per ${rule.periodDaysWorked} days worked`;
                  }
                  if (rule.accrualType === 'tiered') {
                    return 'Multiple phases (click to manage)';
                  }
                  return rule.accrualRate || '-';
                };
                return (
                  <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.leaveType}</Badge>
                    </TableCell>
                    <TableCell>{empType?.name || 'All Types'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rule.accrualType || 'fixed'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getFormulaDisplay()}</TableCell>
                    <TableCell>{rule.maxAccrual ? `${rule.maxAccrual} days` : '-'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {rule.accrualType === 'tiered' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenPhaseEditor(rule)}
                          data-testid={`button-manage-phases-${rule.id}`}
                        >
                          <Settings className="h-3 w-3 mr-1" /> Phases
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditRule(rule)} data-testid={`button-edit-rule-${rule.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteRule(rule.id)}
                        data-testid={`button-delete-rule-${rule.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave Calculation Guide</CardTitle>
          <CardDescription>How leave entitlements are calculated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900">Annual Leave</h4>
            <p className="text-sm text-blue-700">Days leave per month, accrued pro-rata based on days worked</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <h4 className="font-semibold text-amber-900">Sick Leave</h4>
            <p className="text-sm text-amber-700">1 day for every 26 days worked for the first 6 months. After 6 months, 30 days every 3 years.</p>
          </div>
        </CardContent>
      </Card>

      {/* Leave Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditingRule ? 'Edit Leave Rule' : 'Add New Leave Rule'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ruleName" className="text-right">Name</Label>
              <Input 
                id="ruleName" 
                value={currentRule.name || ''} 
                onChange={(e) => setCurrentRule({...currentRule, name: e.target.value})}
                className="col-span-3"
                placeholder="e.g., Annual Leave Accrual"
                data-testid="input-rule-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaveType" className="text-right">Leave Type</Label>
              <div className="col-span-3">
                <Select 
                  value={currentRule.leaveType || ''} 
                  onValueChange={(value) => setCurrentRule({...currentRule, leaveType: value})}
                >
                  <SelectTrigger data-testid="select-rule-leave-type">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual Leave</SelectItem>
                    <SelectItem value="Sick">Sick Leave</SelectItem>
                    <SelectItem value="Family Responsibility">Family Responsibility</SelectItem>
                    <SelectItem value="Study">Study Leave</SelectItem>
                    <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ruleEmpType" className="text-right">Employee Type</Label>
              <div className="col-span-3">
                <Select 
                  value={currentRule.employeeTypeId?.toString() || 'all'} 
                  onValueChange={(value) => setCurrentRule({...currentRule, employeeTypeId: value === 'all' ? undefined : parseInt(value)})}
                >
                  <SelectTrigger data-testid="select-rule-emp-type">
                    <SelectValue placeholder="Select employee type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employee Types</SelectItem>
                    {employeeTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accrualType" className="text-right">Accrual Type</Label>
              <div className="col-span-3">
                <Select 
                  value={currentRule.accrualType || 'fixed'} 
                  onValueChange={(value) => setCurrentRule({...currentRule, accrualType: value})}
                >
                  <SelectTrigger data-testid="select-accrual-type">
                    <SelectValue placeholder="Select accrual type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed (days per year)</SelectItem>
                    <SelectItem value="monthly">Monthly (days per month)</SelectItem>
                    <SelectItem value="days_worked">Days Worked (1 day per X days)</SelectItem>
                    <SelectItem value="cycle">Cycle Based (days per X months)</SelectItem>
                    <SelectItem value="tiered">Tiered (different rates based on tenure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {currentRule.accrualType === 'days_worked' && (
              <div className="col-span-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-3">Days Worked Formula: Earn X days for every Y days worked</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="daysEarned" className="text-sm">Days Earned</Label>
                    <Input 
                      id="daysEarned" 
                      value={currentRule.daysEarned || '1'} 
                      onChange={(e) => setCurrentRule({...currentRule, daysEarned: e.target.value})}
                      placeholder="e.g., 1 or 1.6"
                      data-testid="input-days-earned"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periodDaysWorked" className="text-sm">Per Days Worked</Label>
                    <Input 
                      id="periodDaysWorked" 
                      type="number"
                      value={currentRule.periodDaysWorked || 26} 
                      onChange={(e) => setCurrentRule({...currentRule, periodDaysWorked: e.target.value ? parseInt(e.target.value) : undefined})}
                      placeholder="e.g., 26"
                      data-testid="input-period-days-worked"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Example: "1 day per 26 days worked" = Earn 1 day for every 26 days worked
                </p>
              </div>
            )}

            {currentRule.accrualType === 'tiered' && (
              <div className="col-span-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-900 mb-2">Tiered Accrual</p>
                <p className="text-xs text-amber-700 mb-3">
                  Tiered rules allow different accrual rates based on employment tenure. 
                  For example: "1 day per 26 days for first 6 months, then 30 days every 3 years."
                </p>
                <p className="text-xs text-amber-600">
                  After saving this rule, click "Manage Phases" to configure the tiered phases.
                </p>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accrualRate" className="text-right">Accrual Rate</Label>
              <Input 
                id="accrualRate" 
                value={currentRule.accrualRate || ''} 
                onChange={(e) => setCurrentRule({...currentRule, accrualRate: e.target.value})}
                className="col-span-3"
                placeholder="e.g., 1.25 days/month or 15 days/year"
                data-testid="input-accrual-rate"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxAccrual" className="text-right">Max Accrual</Label>
              <Input 
                id="maxAccrual" 
                type="number"
                value={currentRule.maxAccrual || ''} 
                onChange={(e) => setCurrentRule({...currentRule, maxAccrual: e.target.value ? parseInt(e.target.value) : undefined})}
                className="col-span-3"
                placeholder="Maximum days (e.g., 30)"
                data-testid="input-max-accrual"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="waitingPeriod" className="text-right">Waiting Period</Label>
              <Input 
                id="waitingPeriod" 
                type="number"
                value={currentRule.waitingPeriodDays || ''} 
                onChange={(e) => setCurrentRule({...currentRule, waitingPeriodDays: e.target.value ? parseInt(e.target.value) : undefined})}
                className="col-span-3"
                placeholder="Days before rule applies (e.g., 180)"
                data-testid="input-waiting-period"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cycleMonths" className="text-right">Cycle Months</Label>
              <Input 
                id="cycleMonths" 
                type="number"
                value={currentRule.cycleMonths || ''} 
                onChange={(e) => setCurrentRule({...currentRule, cycleMonths: e.target.value ? parseInt(e.target.value) : undefined})}
                className="col-span-3"
                placeholder="Cycle length in months (e.g., 36)"
                data-testid="input-cycle-months"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="ruleNotes" className="text-right pt-2">Notes</Label>
              <Textarea 
                id="ruleNotes" 
                value={currentRule.notes || ''} 
                onChange={(e) => setCurrentRule({...currentRule, notes: e.target.value})}
                className="col-span-3"
                placeholder="Additional notes about this rule"
                data-testid="input-rule-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveRule} data-testid="button-save-rule">
              {isEditingRule ? 'Save Changes' : 'Create Leave Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Rule Phase Editor Dialog */}
      <Dialog open={isPhaseDialogOpen} onOpenChange={setIsPhaseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Tiered Phases</DialogTitle>
            <DialogDescription>
              Configure different accrual rates based on employment tenure for: {currentPhaseRule?.name}
            </DialogDescription>
          </DialogHeader>
          
          {loadingPhases ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {phases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No phases configured yet. Add phases to define tiered accrual.</p>
                </div>
              ) : (
                phases.map((phase, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Input
                        value={phase.phaseName}
                        onChange={(e) => handleUpdatePhase(index, { phaseName: e.target.value })}
                        className="font-medium w-48"
                        placeholder="Phase name"
                        data-testid={`input-phase-name-${index}`}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemovePhase(index)}
                        data-testid={`button-remove-phase-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Starts After (Months)</Label>
                        <Input
                          type="number"
                          value={phase.startsAfterMonths ?? 0}
                          onChange={(e) => handleUpdatePhase(index, { startsAfterMonths: parseInt(e.target.value) || 0 })}
                          placeholder="0 = immediately"
                          data-testid={`input-phase-start-${index}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Or Starts After (Days Worked)</Label>
                        <Input
                          type="number"
                          value={phase.startsAfterDaysWorked ?? ''}
                          onChange={(e) => handleUpdatePhase(index, { startsAfterDaysWorked: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="Optional alternative"
                          data-testid={`input-phase-days-worked-start-${index}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Accrual Type</Label>
                        <Select
                          value={phase.accrualType}
                          onValueChange={(value) => handleUpdatePhase(index, { accrualType: value })}
                        >
                          <SelectTrigger data-testid={`select-phase-accrual-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_days_worked">Per Days Worked</SelectItem>
                            <SelectItem value="fixed_per_cycle">Fixed Per Cycle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {phase.accrualType === 'fixed_per_cycle' && (
                        <div className="space-y-2">
                          <Label className="text-sm">Cycle (Months)</Label>
                          <Input
                            type="number"
                            value={phase.cycleMonths ?? ''}
                            onChange={(e) => handleUpdatePhase(index, { cycleMonths: e.target.value ? parseInt(e.target.value) : null })}
                            placeholder="e.g., 36 for 3 years"
                            data-testid={`input-phase-cycle-${index}`}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Days Earned</Label>
                        <Input
                          value={phase.daysEarned}
                          onChange={(e) => handleUpdatePhase(index, { daysEarned: e.target.value })}
                          placeholder="1"
                          data-testid={`input-phase-days-earned-${index}`}
                        />
                      </div>
                      {phase.accrualType === 'per_days_worked' && (
                        <div className="space-y-2">
                          <Label className="text-sm">Per Days Worked</Label>
                          <Input
                            type="number"
                            value={phase.periodDaysWorked ?? 26}
                            onChange={(e) => handleUpdatePhase(index, { periodDaysWorked: parseInt(e.target.value) || 26 })}
                            placeholder="26"
                            data-testid={`input-phase-period-${index}`}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-sm">Max Balance Days</Label>
                        <Input
                          type="number"
                          value={phase.maxBalanceDays ?? ''}
                          onChange={(e) => handleUpdatePhase(index, { maxBalanceDays: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="Optional"
                          data-testid={`input-phase-max-${index}`}
                        />
                      </div>
                    </div>
                  </Card>
                ))
              )}

              <Button 
                variant="outline" 
                onClick={handleAddPhase} 
                className="w-full"
                data-testid="button-add-phase"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Phase
              </Button>

              <div className="p-3 bg-slate-50 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium mb-2">Example: Sick Leave Tiered Accrual</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Phase 1:</strong> Months 0-6: 1 day per 26 days worked</li>
                  <li><strong>Phase 2:</strong> Month 6+: 30 days per 36 month cycle</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPhaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePhases} data-testid="button-save-phases">
              Save Phases
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
