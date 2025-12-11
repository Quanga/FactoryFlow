import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/lib/auth-context';
import { leaveBalanceApi, leaveRequestApi } from '@/lib/api';
import { Clock, Calendar, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: balances = [] } = useQuery({
    queryKey: ['leave-balances', user?.id],
    queryFn: () => leaveBalanceApi.getByUserId(user!.id),
    enabled: !!user,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['leave-requests', user?.id],
    queryFn: () => leaveRequestApi.getAll(user!.id),
    enabled: !!user,
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Welcome back, {user?.nickname || user?.firstName}</h1>
          <p className="text-muted-foreground mt-1">Here's an overview of your leave and attendance.</p>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {balances.map((balance) => {
            const available = balance.total - balance.taken - balance.pending;
            return (
              <Card key={balance.id} className="industrial-card relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar className="h-16 w-16" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    {balance.leaveType}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-heading text-foreground">{available}</div>
                  <p className="text-xs text-muted-foreground mb-4">days available</p>
                  <Progress value={(available / balance.total) * 100} className="h-2" />
                  <div className="mt-2 text-xs text-right text-muted-foreground">
                    {balance.total} total entitlement
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Requests */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 shadow-sm border-t-4 border-t-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Recent Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leave requests yet. Click "Request Leave" to submit your first application.
                  </div>
                ) : (
                  requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          req.status === 'approved' ? 'bg-green-100 text-green-600' :
                          req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {req.status === 'approved' ? <CheckCircle2 className="h-5 w-5" /> :
                           req.status === 'rejected' ? <AlertCircle className="h-5 w-5" /> :
                           <Clock className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="font-medium">{req.leaveType}</div>
                          <div className="text-sm text-muted-foreground">{req.startDate} - {req.endDate}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                           req.status === 'approved' ? 'bg-green-100 text-green-700' :
                           req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                           'bg-yellow-100 text-yellow-700'
                        }`}>
                          {req.status}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{req.reason}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions / Notices */}
          <Card className="bg-primary text-primary-foreground shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                System Notices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white/10 rounded border border-white/20">
                <h4 className="font-bold text-sm mb-1">Year End Shutdown</h4>
                <p className="text-xs opacity-90">Factory will be closed from Dec 24th to Jan 2nd. Please submit leave requests early.</p>
              </div>
              <div className="p-3 bg-white/10 rounded border border-white/20">
                 <h4 className="font-bold text-sm mb-1">New Policy</h4>
                 <p className="text-xs opacity-90">Sick leave longer than 2 days requires a medical certificate upload.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
