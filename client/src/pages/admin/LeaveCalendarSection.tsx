import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from 'date-fns';
import { leaveRequestApi, userApi, publicHolidayApi } from '@/lib/api';
import type { LeaveRequest, PublicHoliday, User } from '@shared/schema';

export default function LeaveCalendarSection() {
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => leaveRequestApi.getAll(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const { data: publicHolidays = [] } = useQuery({
    queryKey: ['public-holidays'],
    queryFn: () => publicHolidayApi.getAll(),
  });

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const approvedLeaves = (leaveRequests as LeaveRequest[]).filter((lr: LeaveRequest) => lr.status === 'approved');
  const monthHolidays = (publicHolidays as PublicHoliday[]).filter((h: PublicHoliday) => {
    const hDate = new Date(h.date);
    return hDate.getMonth() === currentMonth && hDate.getFullYear() === currentYear;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-slate-100">Leave Calendar</h1>
        <p className="text-muted-foreground">Visual overview of employee leave schedules</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Leave Overview</CardTitle>
          <CardDescription>See who is on leave and when</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {format(today, 'MMMM yyyy')}
              </h3>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div> Approved Leave
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div> Public Holiday
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="font-semibold py-2 text-muted-foreground">{d}</div>
              ))}
              
              {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="py-2"></div>
              ))}
              
              {days.map(day => {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isHoliday = monthHolidays.some((h: PublicHoliday) => h.date === dateStr);
                const leavesOnDay = approvedLeaves.filter((lr: LeaveRequest) => 
                  lr.startDate <= dateStr && lr.endDate >= dateStr
                );
                const isToday = day === today.getDate();
                
                return (
                  <div 
                    key={day} 
                    className={`py-2 rounded relative ${isToday ? 'ring-2 ring-primary' : ''} ${isHoliday ? 'bg-red-100 dark:bg-red-900' : leavesOnDay.length > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-muted/30'}`}
                    title={isHoliday ? monthHolidays.find((h: PublicHoliday) => h.date === dateStr)?.name : leavesOnDay.length > 0 ? `${leavesOnDay.length} on leave` : undefined}
                  >
                    <span className={isToday ? 'font-bold' : ''}>{day}</span>
                    {leavesOnDay.length > 0 && !isHoliday && (
                      <span className="absolute bottom-0 right-0 text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                        {leavesOnDay.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Upcoming Leave This Month</h4>
              {approvedLeaves.filter((lr: LeaveRequest) => {
                const start = new Date(lr.startDate);
                return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
              }).length === 0 ? (
                <p className="text-muted-foreground text-sm">No approved leave this month</p>
              ) : (
                <div className="space-y-2">
                  {approvedLeaves.filter((lr: LeaveRequest) => {
                    const start = new Date(lr.startDate);
                    return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
                  }).map((lr: LeaveRequest) => {
                    const emp = (users as User[]).find(u => u.id === lr.userId);
                    return (
                      <div key={lr.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="font-medium">{emp?.firstName} {emp?.surname}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(lr.startDate), 'dd/MM')} - {format(new Date(lr.endDate), 'dd/MM')} ({lr.leaveType})
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
