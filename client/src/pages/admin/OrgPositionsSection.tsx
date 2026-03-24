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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { orgPositionApi, departmentApi, userApi } from '@/lib/api';
import type { OrgPosition, Department, User } from '@shared/schema';

export default function OrgPositionsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orgPositions = [] } = useQuery<OrgPosition[]>({
    queryKey: ['org-positions'],
    queryFn: () => orgPositionApi.getAll(),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: departmentApi.getAll,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);
  const [positionForm, setPositionForm] = useState({ title: '', department: '', parentPositionId: '', sortOrder: '0', isOutsourced: false, tier: '1' });

  const createPositionMutation = useMutation({
    mutationFn: (data: any) => orgPositionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      setPositionDialogOpen(false);
      toast({ title: "Position Created", description: "Org position has been added." });
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => orgPositionApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      setPositionDialogOpen(false);
      toast({ title: "Position Updated", description: "Org position has been updated." });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: (id: number) => orgPositionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      toast({ title: "Position Deleted", description: "Org position has been removed." });
    },
  });

  const handleOpenCreatePosition = () => {
    setEditingPosition(null);
    setPositionForm({ title: '', department: '', parentPositionId: '', sortOrder: '0', isOutsourced: false, tier: '1' });
    setPositionDialogOpen(true);
  };

  const handleOpenEditPosition = (pos: OrgPosition) => {
    setEditingPosition(pos);
    setPositionForm({
      title: pos.title,
      department: pos.department || '',
      parentPositionId: pos.parentPositionId ? String(pos.parentPositionId) : '',
      sortOrder: String(pos.sortOrder || 0),
      isOutsourced: (pos as any).isOutsourced || false,
      tier: String((pos as any).tier || 1),
    });
    setPositionDialogOpen(true);
  };

  const handleSavePosition = () => {
    if (!positionForm.title) {
      toast({ variant: 'destructive', title: 'Error', description: 'Position title is required' });
      return;
    }

    const payload = {
      title: positionForm.title,
      department: positionForm.department || null,
      parentPositionId: positionForm.parentPositionId ? parseInt(positionForm.parentPositionId) : null,
      sortOrder: parseInt(positionForm.sortOrder) || 0,
      isOutsourced: positionForm.isOutsourced,
      tier: parseInt(positionForm.tier) || 1,
    };

    if (editingPosition) {
      updatePositionMutation.mutate({ id: editingPosition.id, ...payload });
    } else {
      createPositionMutation.mutate(payload);
    }
  };

  const handleDeletePosition = (id: number) => {
    if (window.confirm('Are you sure you want to delete this position?')) {
      deletePositionMutation.mutate(id);
    }
  };

  const isManagerPosition = (title: string) => /manager|director|assistant|supervisor/i.test(title);
  const managerPositions = [...orgPositions].filter(p => isManagerPosition(p.title)).sort((a, b) => a.title.localeCompare(b.title));
  const staffPositions = [...orgPositions].filter(p => !isManagerPosition(p.title)).sort((a, b) => a.title.localeCompare(b.title));

  const renderPositionTable = (positions: OrgPosition[], label: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{label} ({positions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Parent Position</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Assigned Employee(s)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((pos) => {
              const parentPos = orgPositions.find(p => p.id === pos.parentPositionId);
              const assignedUsers = users.filter(u => u.orgPositionId === pos.id && !u.terminationDate);
              const isFilled = assignedUsers.length > 0;
              const isOutsourced = !isFilled && (pos as any).isOutsourced;
              return (
                <TableRow key={pos.id} data-testid={`row-position-${pos.id}`}>
                  <TableCell className="font-medium">{pos.title}</TableCell>
                  <TableCell>{pos.department || '-'}</TableCell>
                  <TableCell>{parentPos ? parentPos.title : <span className="text-muted-foreground italic">Root</span>}</TableCell>
                  <TableCell>
                    {(() => {
                      const t = (pos as any).tier || 1;
                      return t > 1
                        ? <Badge variant="outline" className="text-xs border-slate-400 text-slate-600">Tier {t}</Badge>
                        : <span className="text-muted-foreground text-xs">1</span>;
                    })()}
                  </TableCell>
                  <TableCell>
                    {isFilled ? (
                      <div className="space-y-0.5">
                        {assignedUsers
                          .sort((a, b) => `${a.firstName} ${a.surname}`.localeCompare(`${b.firstName} ${b.surname}`))
                          .map((u) => (
                            <div key={u.id} className="text-sm">{u.firstName} {u.surname}</div>
                          ))}
                      </div>
                    ) : isOutsourced ? (
                      <span className="text-amber-600 italic">Outsourced</span>
                    ) : (
                      <span className="text-red-500 italic">Vacant</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isFilled ? (
                      <Badge variant="default" className="bg-green-600">{assignedUsers.length} assigned</Badge>
                    ) : isOutsourced ? (
                      <Badge className="bg-amber-500 text-white">Outsourced</Badge>
                    ) : (
                      <Badge variant="destructive">Vacant</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditPosition(pos)} data-testid={`button-edit-position-${pos.id}`}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePosition(pos.id)} data-testid={`button-delete-position-${pos.id}`}>
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
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-slate-100">Org Positions</h1>
          <p className="text-muted-foreground">Define the position-based hierarchy for the org chart. When positions exist, the org chart uses them instead of the manager-based tree.</p>
        </div>
        <Button onClick={handleOpenCreatePosition} data-testid="button-add-position">
          <Plus className="h-4 w-4 mr-2" /> Add Position
        </Button>
      </div>
      
      {orgPositions.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No positions defined yet. The org chart will use the manager-based hierarchy. Add positions to switch to a position-based org chart.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {renderPositionTable(managerPositions, 'Manager Positions')}
          {renderPositionTable(staffPositions, 'Staff Positions')}
        </>
      )}

      <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPosition ? 'Edit Position' : 'Add Position'}</DialogTitle>
            <DialogDescription>
              {editingPosition ? 'Update the position details below.' : 'Create a new position in the org chart hierarchy.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pos-title">Position Title *</Label>
              <Input
                id="pos-title"
                value={positionForm.title}
                onChange={(e) => setPositionForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. General Manager, Mechanical Supervisor"
                data-testid="input-position-title"
              />
            </div>
            <div>
              <Label htmlFor="pos-department">Department</Label>
              <Select value={positionForm.department || "__none__"} onValueChange={(v) => setPositionForm(f => ({ ...f, department: v === '__none__' ? '' : v }))}>
                <SelectTrigger data-testid="select-position-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Department</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pos-parent">Parent Position</Label>
              <Select value={positionForm.parentPositionId || "__none__"} onValueChange={(v) => setPositionForm(f => ({ ...f, parentPositionId: v === '__none__' ? '' : v }))}>
                <SelectTrigger data-testid="select-position-parent">
                  <SelectValue placeholder="None (Root Position)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (Root Position)</SelectItem>
                  {orgPositions
                    .filter(p => !editingPosition || p.id !== editingPosition.id)
                    .map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.title}{p.department ? ` (${p.department})` : ''}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2">
                Employees are assigned to positions from the employee edit page, not here. This page is for defining position names and hierarchy only.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <Checkbox
                id="pos-outsourced"
                checked={positionForm.isOutsourced}
                onCheckedChange={(checked) => setPositionForm(f => ({ ...f, isOutsourced: !!checked }))}
                data-testid="checkbox-position-outsourced"
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="pos-outsourced" className="font-medium cursor-pointer">Mark as Outsourced</Label>
                <p className="text-xs text-muted-foreground mt-0.5">When no employee is assigned, the org chart will show this position as "Outsourced" (amber) instead of "Vacant" (red).</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pos-sort">Sort Order</Label>
                <Input
                  id="pos-sort"
                  type="number"
                  value={positionForm.sortOrder}
                  onChange={(e) => setPositionForm(f => ({ ...f, sortOrder: e.target.value }))}
                  placeholder="0"
                  data-testid="input-position-sort"
                />
                <p className="text-xs text-muted-foreground mt-1">Lower = left among siblings</p>
              </div>
              <div>
                <Label htmlFor="pos-tier">Org Chart Tier</Label>
                <Select value={positionForm.tier} onValueChange={(v) => setPositionForm(f => ({ ...f, tier: v }))}>
                  <SelectTrigger id="pos-tier" data-testid="select-position-tier">
                    <SelectValue placeholder="Tier 1 (normal)" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(t => (
                      <SelectItem key={t} value={String(t)}>
                        Tier {t}{t === 1 ? ' (normal)' : ` (${t - 1} row${t - 1 > 1 ? 's' : ''} lower)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Higher = pushed down in chart</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePosition} data-testid="button-save-position">
              <Save className="h-4 w-4 mr-2" /> {editingPosition ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
