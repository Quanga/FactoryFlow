import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Building2, User as UserIcon, Crown, Briefcase } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { userApi, departmentApi } from '@/lib/api';
import type { User, Department } from '@shared/schema';

interface OrgNode {
  user: User;
  children: OrgNode[];
}

function UserCard({ user, isManager = false }: { user: User; isManager?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border-2 ${isManager ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'} shadow-sm min-w-[180px]`}>
      <div className="flex items-center gap-3">
        {user.photoUrl ? (
          <img src={user.photoUrl} alt={user.firstName} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isManager ? 'bg-primary text-white' : 'bg-slate-200'}`}>
            {isManager ? <Crown className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{user.firstName} {user.surname}</p>
          <p className="text-xs text-muted-foreground truncate">{user.id}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <Badge variant={user.role === 'manager' ? 'default' : 'secondary'} className="text-xs">
          {user.role === 'manager' ? 'Manager' : 'Worker'}
        </Badge>
      </div>
    </div>
  );
}

function OrgTree({ node, level = 0 }: { node: OrgNode; level?: number }) {
  const hasChildren = node.children.length > 0;
  
  return (
    <div className="flex flex-col items-center">
      <UserCard user={node.user} isManager={node.user.role === 'manager'} />
      
      {hasChildren && (
        <>
          <div className="w-px h-6 bg-slate-300" />
          <div className="flex items-start gap-6">
            {node.children.map((child, index) => (
              <div key={child.user.id} className="flex flex-col items-center">
                {node.children.length > 1 && (
                  <div className="flex items-center">
                    {index === 0 && <div className="w-1/2" />}
                    <div className={`h-px bg-slate-300 ${
                      index === 0 ? 'w-1/2 ml-auto' : 
                      index === node.children.length - 1 ? 'w-1/2 mr-auto' : 
                      'w-full'
                    }`} style={{ minWidth: '30px' }} />
                    {index === node.children.length - 1 && <div className="w-1/2" />}
                  </div>
                )}
                <div className="w-px h-4 bg-slate-300" />
                <OrgTree node={child} level={level + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DepartmentSection({ department, users }: { department: Department; users: User[] }) {
  const deptUsers = users.filter(u => u.department === department.name);
  
  if (deptUsers.length === 0) return null;
  
  const managers = deptUsers.filter(u => u.role === 'manager');
  const workers = deptUsers.filter(u => u.role === 'worker');
  
  const buildTree = (managerId: string | null): OrgNode[] => {
    const directReports = deptUsers.filter(u => u.managerId === managerId);
    return directReports.map(user => ({
      user,
      children: buildTree(user.id)
    }));
  };
  
  const topLevel = deptUsers.filter(u => !u.managerId || !deptUsers.find(d => d.id === u.managerId));
  const roots: OrgNode[] = topLevel.map(user => ({
    user,
    children: buildTree(user.id)
  }));

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          {department.name}
          <Badge variant="outline" className="ml-2">{deptUsers.length} employees</Badge>
        </CardTitle>
        {department.description && (
          <p className="text-sm text-muted-foreground">{department.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-8 justify-center min-w-max p-4">
            {roots.map(root => (
              <OrgTree key={root.user.id} node={root} />
            ))}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground mr-2">Summary:</span>
          <Badge variant="default">{managers.length} Manager{managers.length !== 1 ? 's' : ''}</Badge>
          <Badge variant="secondary">{workers.length} Worker{workers.length !== 1 ? 's' : ''}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrgChart() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'manager') {
      setLocation('/login');
    }
  }, [user, setLocation]);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const { data: departments = [], isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: departmentApi.getAll,
  });

  const isLoading = usersLoading || deptsLoading;

  const activeUsers = users.filter(u => !u.terminationDate);
  const unassigned = activeUsers.filter(u => !u.department);
  const totalManagers = activeUsers.filter(u => u.role === 'manager').length;
  const totalWorkers = activeUsers.filter(u => u.role === 'worker').length;

  if (!user || user.role !== 'manager') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/admin/dashboard')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Organization Chart
                </h1>
                <p className="text-sm text-muted-foreground">Workforce hierarchy by department</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalManagers}</p>
                  <p className="text-sm text-muted-foreground">Managers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Briefcase className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalWorkers}</p>
                  <p className="text-sm text-muted-foreground">Workers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{departments.length}</p>
                  <p className="text-sm text-muted-foreground">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 justify-center">
                    <Skeleton className="h-24 w-48" />
                    <Skeleton className="h-24 w-48" />
                    <Skeleton className="h-24 w-48" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {departments.map(dept => (
              <DepartmentSection key={dept.id} department={dept} users={activeUsers} />
            ))}
            
            {unassigned.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-amber-800">
                    <Users className="h-5 w-5" />
                    Unassigned Employees
                    <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700">
                      {unassigned.length} employees
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-amber-700">These employees have not been assigned to a department</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {unassigned.map(u => (
                      <UserCard key={u.id} user={u} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
