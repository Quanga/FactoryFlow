import { useEffect, useMemo, useRef } from 'react';
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

interface EmployeeCardProps {
  user: User;
  isLeader?: boolean;
}

function EmployeeCard({ user, isLeader }: EmployeeCardProps) {
  const isManager = user.role === 'manager';
  
  return (
    <div 
      className={`p-3 rounded-lg border-2 shadow-sm ${
        isLeader ? 'border-amber-500 bg-amber-50' :
        isManager ? 'border-primary bg-primary/5' : 
        'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {user.photoUrl ? (
          <img 
            src={user.photoUrl} 
            alt={`${user.firstName} ${user.surname}`} 
            className="w-10 h-10 rounded-full object-cover shrink-0" 
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isLeader ? 'bg-amber-500 text-white' :
            isManager ? 'bg-primary text-white' : 
            'bg-slate-200'
          }`}>
            {isLeader ? <Crown className="h-5 w-5" /> :
             isManager ? <Crown className="h-4 w-4" /> : 
             <UserIcon className="h-4 w-4" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{user.firstName} {user.surname}</p>
          <p className="text-xs text-muted-foreground">{user.id}</p>
          <Badge 
            variant={isManager ? 'default' : 'secondary'} 
            className="text-[10px] px-1.5 py-0 h-4 mt-1"
          >
            {isManager ? 'Manager' : 'Worker'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

interface DepartmentColumnProps {
  department: Department;
  employees: User[];
  color: string;
}

function DepartmentColumn({ department, employees, color }: DepartmentColumnProps) {
  // Sort: managers first, then workers
  const managers = employees.filter(e => e.role === 'manager');
  const workers = employees.filter(e => e.role === 'worker');
  const sortedEmployees = [...managers, ...workers];
  
  return (
    <div className="flex flex-col min-w-[200px] max-w-[220px]">
      {/* Department header */}
      <div 
        className="px-3 py-2 rounded-t-lg text-white font-semibold text-sm text-center"
        style={{ backgroundColor: color }}
      >
        <Building2 className="h-4 w-4 inline-block mr-1 mb-0.5" />
        {department.name}
      </div>
      
      {/* Employee list */}
      <div 
        className="flex-1 border-2 border-t-0 rounded-b-lg p-2 space-y-2 bg-slate-50"
        style={{ borderColor: color }}
      >
        {sortedEmployees.length > 0 ? (
          sortedEmployees.map(emp => (
            <EmployeeCard key={emp.id} user={emp} />
          ))
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No employees
          </div>
        )}
      </div>
      
      {/* Count footer */}
      <div className="text-center text-xs text-muted-foreground mt-1">
        {managers.length} manager{managers.length !== 1 ? 's' : ''}, {workers.length} worker{workers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

const DEPARTMENT_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#ea580c', // orange
  '#7c3aed', // purple
  '#0891b2', // cyan
  '#be123c', // rose
  '#4f46e5', // indigo
  '#ca8a04', // yellow
  '#0d9488', // teal
  '#dc2626', // red
];

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

  const activeUsers = useMemo(() => users.filter(u => !u.terminationDate), [users]);

  // Find the top leader(s) - users with no manager or managing director role
  const topLeaders = useMemo(() => {
    const userMap = new Map(activeUsers.map(u => [u.id, u]));
    return activeUsers.filter(u => !u.managerId || !userMap.has(u.managerId));
  }, [activeUsers]);

  // Group employees by department
  const employeesByDepartment = useMemo(() => {
    const map = new Map<string, User[]>();
    
    // Initialize all departments
    departments.forEach(dept => {
      map.set(dept.name, []);
    });
    
    // Add employees to their departments (excluding top leaders)
    activeUsers.forEach(user => {
      if (topLeaders.some(l => l.id === user.id)) return; // Skip top leaders
      
      const deptName = user.department || 'Unassigned';
      if (!map.has(deptName)) {
        map.set(deptName, []);
      }
      map.get(deptName)!.push(user);
    });
    
    return map;
  }, [activeUsers, departments, topLeaders]);

  // Get departments with employees (sorted by name)
  const activeDepartments = useMemo(() => {
    return departments
      .filter(dept => (employeesByDepartment.get(dept.name)?.length || 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments, employeesByDepartment]);

  // Check for unassigned employees
  const unassignedEmployees = employeesByDepartment.get('Unassigned') || [];

  const totalManagers = activeUsers.filter(u => u.role === 'manager').length;
  const totalWorkers = activeUsers.filter(u => u.role === 'worker').length;

  if (!user || user.role !== 'manager') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-4">
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
                <p className="text-sm text-muted-foreground">Company hierarchy by department</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <Crown className="h-3 w-3" /> {totalManagers} Managers
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3 w-3" /> {totalWorkers} Workers
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Building2 className="h-3 w-3" /> {departments.length} Departments
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4">
        {isLoading ? (
          <Card>
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
        ) : activeUsers.length > 0 ? (
          <div className="space-y-6">
            {/* Top Leadership */}
            {topLeaders.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    Leadership
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 justify-center">
                    {topLeaders.map(leader => (
                      <div key={leader.id} className="w-[200px]">
                        <EmployeeCard user={leader} isLeader />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connector line */}
            <div className="flex justify-center">
              <div className="w-0.5 h-8 bg-slate-300" />
            </div>

            {/* Departments Grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Departments
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Employees grouped by department (managers shown first)
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {activeDepartments.map((dept, index) => (
                      <DepartmentColumn
                        key={dept.id}
                        department={dept}
                        employees={employeesByDepartment.get(dept.name) || []}
                        color={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                      />
                    ))}
                    
                    {/* Unassigned employees */}
                    {unassignedEmployees.length > 0 && (
                      <DepartmentColumn
                        department={{ id: 0, name: 'Unassigned', description: null, createdAt: new Date() }}
                        employees={unassignedEmployees}
                        color="#6b7280"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No employees found</p>
              <p className="text-sm text-muted-foreground">Add employees to see the organization chart</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
