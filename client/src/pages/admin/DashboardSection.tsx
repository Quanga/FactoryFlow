import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  X,
  TrendingUp
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { 
  userApi, 
  leaveRequestApi, 
  leaveBalanceApi, 
  attendanceApi, 
  dashboardApi 
} from '@/lib/api';
import type { 
  User, 
  LeaveRequest, 
  LeaveBalance, 
  AttendanceRecord 
} from '@shared/schema';
import { useAuth } from '@/lib/auth-context';
import { formatLeaveStatus, canTakeAction } from './utils';

interface DashboardSectionProps {
  setActiveSection: (section: any) => void;
}

export default function DashboardSection({ 
  setActiveSection,
}: DashboardSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => leaveRequestApi.getAll(),
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: () => leaveBalanceApi.getAll(),
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const sevenDaysAgoStr = format(subDays(new Date(), 6), 'yyyy-MM-dd');

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance', todayStr, todayStr],
    queryFn: () => attendanceApi.getAll(todayStr, todayStr),
  });

  const { data: weekAttendance = [] } = useQuery({
    queryKey: ['attendance', sevenDaysAgoStr, todayStr],
    queryFn: () => attendanceApi.getAll(sevenDaysAgoStr, todayStr),
    refetchInterval: 300000,
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 60000,
  });

  const managerDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: 'approved' | 'rejected'; notes?: string }) => 
      leaveRequestApi.managerDecision(id, user?.id || '', decision, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    }
  });

  const hrDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: 'approved' | 'rejected'; notes?: string }) => 
      leaveRequestApi.hrDecision(id, user?.id || '', decision, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    }
  });

  const mdDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: 'approved' | 'rejected'; notes?: string }) => 
      leaveRequestApi.mdDecision(id, user?.id || '', decision, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    }
  });

  const activeEmployees = React.useMemo(() =>
    users.filter((u: any) => !u.terminationDate && !u.excludeFromLeave),
  [users]);

  const sevenDayTrend = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dayStr = format(d, 'yyyy-MM-dd');
      const count = new Set(
        (weekAttendance as AttendanceRecord[])
          .filter(r => r.type === 'in' && format(new Date(r.timestamp), 'yyyy-MM-dd') === dayStr)
          .map(r => r.userId)
      ).size;
      return { dayStr, label: format(d, 'EEE'), count, isToday: dayStr === todayStr };
    });
  }, [weekAttendance, todayStr]);

  const pendingCounts = React.useMemo(() => {
    const pending = leaveRequests.filter((r: LeaveRequest) => 
      ['pending_manager', 'pending_hr', 'pending_md', 'pending'].includes(r.status)
    );
    return {
      total: pending.length,
      manager: pending.filter((r: LeaveRequest) => r.status === 'pending_manager' || r.status === 'pending').length,
      hr: pending.filter((r: LeaveRequest) => r.status === 'pending_hr').length,
      md: pending.filter((r: LeaveRequest) => r.status === 'pending_md').length,
    };
  }, [leaveRequests]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your workforce management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeEmployees.length}</p>
                <p className="text-sm text-muted-foreground">Total Personnel</p>
                <p className="text-xs text-muted-foreground">{users.filter((u: any) => u.role === 'worker' && !u.terminationDate).length} workers · {users.filter((u: any) => u.role === 'manager' && !u.terminationDate).length} managers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCounts.total}</p>
                <p className="text-sm text-muted-foreground">Pending Leave</p>
                {pendingCounts.total > 0 && (
                  <div className="flex gap-1 mt-1 text-xs text-muted-foreground">
                    {pendingCounts.manager > 0 && <span className="bg-orange-100 px-1 rounded">M:{pendingCounts.manager}</span>}
                    {pendingCounts.hr > 0 && <span className="bg-blue-100 px-1 rounded">HR:{pendingCounts.hr}</span>}
                    {pendingCounts.md > 0 && <span className="bg-purple-100 px-1 rounded">MD:{pendingCounts.md}</span>}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {attendanceRecords.filter((r: AttendanceRecord) => {
                    const today = new Date().toDateString();
                    return new Date(r.timestamp).toDateString() === today && r.type === 'in';
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Clocked In Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeEmployees.filter((emp: any) => {
                    const empBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === emp.id);
                    return empBalances.some((b: LeaveBalance) => (b.total - b.taken - b.pending) <= 2 && b.total > 0);
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Low Leave Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7-Day Attendance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            7-Day Attendance Trend
          </CardTitle>
          <CardDescription>Unique employees clocked in each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-28">
            {sevenDayTrend.map(({ label, count, isToday }) => {
              const maxCount = Math.max(...sevenDayTrend.map(d => d.count), 1);
              const heightPct = Math.max((count / maxCount) * 100, 4);
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-muted-foreground">{count > 0 ? count : ''}</span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t transition-all ${isToday ? 'bg-green-500' : 'bg-green-200'}`}
                      style={{ height: `${heightPct}%` }}
                      title={`${count} clocked in`}
                    />
                  </div>
                  <span className={`text-xs ${isToday ? 'font-bold text-green-700' : 'text-muted-foreground'}`}>{label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">
            Total active employees: {activeEmployees.length}
          </p>
        </CardContent>
      </Card>

      {/* Pending Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Pending Leave Requests
          </CardTitle>
          <CardDescription>Leave requests awaiting approval at different stages</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingCounts.total === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending leave requests</p>
          ) : (
            <div className="space-y-2">
              {leaveRequests.filter((r: LeaveRequest) => ['pending_manager', 'pending_hr', 'pending_md', 'pending'].includes(r.status)).slice(0, 5).map((request: LeaveRequest) => {
                const employee = users.find(u => u.id === request.userId);
                const actionInfo = canTakeAction(request);
                const statusInfo = formatLeaveStatus(request.status);
                return (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200">
                        <img src={employee?.photoUrl || 'https://github.com/shadcn.png'} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium">{employee ? `${employee.firstName} ${employee.surname}` : request.userId}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.leaveType} • {format(new Date(request.startDate), 'd MMM')} - {format(new Date(request.endDate), 'd MMM')}
                        </p>
                        <Badge variant={statusInfo.variant} className="text-xs mt-1">{statusInfo.label}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setActiveSection('leave-requests')}
                      >
                        Review
                      </Button>
                      {actionInfo.canAct && (
                        <>
                          <Button 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              if (actionInfo.role === 'manager') {
                                managerDecisionMutation.mutate({ id: request.id, decision: 'approved' });
                              } else if (actionInfo.role === 'hr') {
                                hrDecisionMutation.mutate({ id: request.id, decision: 'approved' });
                              } else if (actionInfo.role === 'md') {
                                mdDecisionMutation.mutate({ id: request.id, decision: 'approved' });
                              }
                            }}
                            title={`Approve as ${actionInfo.stage}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (actionInfo.role === 'manager') {
                                managerDecisionMutation.mutate({ id: request.id, decision: 'rejected' });
                              } else if (actionInfo.role === 'hr') {
                                hrDecisionMutation.mutate({ id: request.id, decision: 'rejected' });
                              } else if (actionInfo.role === 'md') {
                                mdDecisionMutation.mutate({ id: request.id, decision: 'rejected' });
                              }
                            }}
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {pendingCounts.total > 5 && (
                <Button variant="link" className="w-full" onClick={() => setActiveSection('leave-requests')}>
                  View all {pendingCounts.total} pending requests
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Leave Balance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Leave Balance Alerts
          </CardTitle>
          <CardDescription>Personnel with 2 or fewer leave days remaining</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeEmployees.map((emp: any) => {
              const empBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === emp.id);
              const lowBalances = empBalances.filter((b: LeaveBalance) => (b.total - b.taken - b.pending) <= 2 && b.total > 0);
              if (lowBalances.length === 0) return null;
              return (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200">
                      <img src={emp.photoUrl || 'https://github.com/shadcn.png'} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="font-medium">{emp.firstName} {emp.surname}</span>
                  </div>
                  <div className="flex gap-2">
                    {lowBalances.map((b: LeaveBalance) => (
                      <Badge key={b.id} variant="outline" className="border-amber-400 text-amber-700">
                        {b.leaveType}: {b.total - b.taken - b.pending} left
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            }).filter(Boolean)}
            {users.filter(u => u.role === 'worker').every(emp => {
              const empBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === emp.id);
              return empBalances.every((b: LeaveBalance) => (b.total - b.taken - b.pending) > 2 || b.total === 0);
            }) && (
              <p className="text-muted-foreground text-center py-4">No personnel with low leave balances</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
