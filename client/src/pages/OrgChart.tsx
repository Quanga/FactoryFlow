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
import * as d3 from 'd3-hierarchy';

interface WorkerData {
  id: string;
  name: string;
  photoUrl: string | null;
}

interface OrgNodeData {
  id: string;
  name: string;
  role: string;
  department: string | null;
  photoUrl: string | null;
  isRoot?: boolean;
  kind: 'manager' | 'department-group';
  workers?: WorkerData[];
  nodeHeight: number;
}

const NODE_WIDTH = 180;
const MANAGER_NODE_HEIGHT = 80;
const WORKER_ROW_HEIGHT = 36;
const DEPT_HEADER_HEIGHT = 24;
const VERTICAL_GAP = 40;
const HORIZONTAL_GAP = 20;

const DEPARTMENT_COLORS: Record<string, string> = {
  'Administration': '#2563eb',
  'Finance': '#16a34a',
  'Front Office': '#ea580c',
  'Human Resources': '#be123c',
  'Manufacturing': '#7c3aed',
  'Mechanical': '#0891b2',
  'Research & Development': '#4f46e5',
  'Sales': '#ca8a04',
  'IT': '#0d9488',
  'Operations': '#dc2626',
  'Managing Director': '#f59e0b',
};

function getDepartmentColor(department: string | null): string {
  if (!department) return '#6b7280';
  return DEPARTMENT_COLORS[department] || '#6b7280';
}

function ManagerNode({ data, x, y }: { data: OrgNodeData; x: number; y: number }) {
  const isRoot = data.isRoot;
  const deptColor = getDepartmentColor(data.department);
  
  return (
    <g transform={`translate(${x - NODE_WIDTH / 2}, ${y})`}>
      <foreignObject width={NODE_WIDTH} height={MANAGER_NODE_HEIGHT}>
        <div 
          className={`h-full p-2 rounded-lg border-2 shadow-md ${
            isRoot ? 'border-amber-500 bg-amber-50' : 'border-primary bg-primary/5'
          }`}
          style={{ 
            borderLeftWidth: '4px',
            borderLeftColor: deptColor 
          }}
        >
          <div className="flex items-center gap-2 h-full">
            {data.photoUrl ? (
              <img 
                src={data.photoUrl} 
                alt={data.name} 
                className="w-10 h-10 rounded-full object-cover shrink-0" 
              />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isRoot ? 'bg-amber-500 text-white' : 'bg-primary text-white'
              }`}>
                <Crown className={isRoot ? "h-5 w-5" : "h-4 w-4"} />
              </div>
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="font-medium text-xs truncate leading-tight">{data.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{data.id}</p>
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="default" className="text-[9px] px-1 py-0 h-4">Manager</Badge>
                {data.department && (
                  <Badge 
                    variant="outline" 
                    className="text-[9px] px-1 py-0 h-4 truncate max-w-[60px]"
                    style={{ borderColor: deptColor, color: deptColor }}
                  >
                    {data.department}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

function DepartmentGroupNode({ data, x, y }: { data: OrgNodeData; x: number; y: number }) {
  const deptColor = getDepartmentColor(data.department);
  const workers = data.workers || [];
  
  return (
    <g transform={`translate(${x - NODE_WIDTH / 2}, ${y})`}>
      <foreignObject width={NODE_WIDTH} height={data.nodeHeight}>
        <div 
          className="h-full rounded-lg border-2 shadow-sm overflow-hidden"
          style={{ borderColor: deptColor }}
        >
          {/* Department header */}
          <div 
            className="px-2 py-1 text-white text-[10px] font-semibold flex items-center gap-1"
            style={{ backgroundColor: deptColor }}
          >
            <Building2 className="h-3 w-3" />
            <span className="truncate">{data.department || 'Unassigned'}</span>
            <span className="ml-auto opacity-75">({workers.length})</span>
          </div>
          
          {/* Workers list */}
          <div className="bg-white">
            {workers.map((worker, idx) => (
              <div 
                key={worker.id}
                className={`flex items-center gap-2 px-2 py-1 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                style={{ height: WORKER_ROW_HEIGHT }}
              >
                {worker.photoUrl ? (
                  <img 
                    src={worker.photoUrl} 
                    alt={worker.name} 
                    className="w-6 h-6 rounded-full object-cover shrink-0" 
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <UserIcon className="h-3 w-3 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{worker.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{worker.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

function OrgNode({ data, x, y }: { data: OrgNodeData; x: number; y: number }) {
  if (data.kind === 'department-group') {
    return <DepartmentGroupNode data={data} x={x} y={y} />;
  }
  return <ManagerNode data={data} x={x} y={y} />;
}

function Connector({ source, target, sourceHeight }: { source: { x: number; y: number }; target: { x: number; y: number }; sourceHeight: number }) {
  const sourceBottom = source.y + sourceHeight;
  const targetTop = target.y;
  const midY = (sourceBottom + targetTop) / 2;
  
  const path = `
    M ${source.x} ${sourceBottom}
    L ${source.x} ${midY}
    L ${target.x} ${midY}
    L ${target.x} ${targetTop}
  `;
  
  return (
    <path
      d={path}
      fill="none"
      stroke="#94a3b8"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export default function OrgChart() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

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

  const { treeData, dimensions } = useMemo(() => {
    if (activeUsers.length === 0) {
      return { treeData: null, dimensions: { width: 800, height: 400, offsetX: 0 } };
    }

    const userMap = new Map(activeUsers.map(u => [u.id, u]));
    const roots = activeUsers.filter(u => !u.managerId || !userMap.has(u.managerId));
    
    interface TreeNode {
      data: OrgNodeData;
      children: TreeNode[];
    }

    const buildSubtree = (userId: string, visited = new Set<string>()): TreeNode | null => {
      if (visited.has(userId)) return null;
      visited.add(userId);
      
      const user = userMap.get(userId);
      if (!user) return null;
      
      const directReports = activeUsers.filter(u => u.managerId === userId);
      const managerReports = directReports.filter(u => u.role === 'manager');
      const workerReports = directReports.filter(u => u.role === 'worker');
      
      // Build subtrees for manager direct reports
      const managerChildren = managerReports
        .sort((a, b) => (a.department || '').localeCompare(b.department || ''))
        .map(u => buildSubtree(u.id, new Set(visited)))
        .filter((n): n is TreeNode => n !== null);
      
      // Group workers by department into department-group nodes
      const workersByDept = new Map<string, User[]>();
      workerReports.forEach(w => {
        const dept = w.department || 'Unassigned';
        if (!workersByDept.has(dept)) workersByDept.set(dept, []);
        workersByDept.get(dept)!.push(w);
      });
      
      const deptGroupChildren: TreeNode[] = Array.from(workersByDept.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dept, workers]) => {
          const nodeHeight = DEPT_HEADER_HEIGHT + workers.length * WORKER_ROW_HEIGHT;
          return {
            data: {
              id: `dept-${userId}-${dept}`,
              name: dept,
              role: 'worker',
              department: dept,
              photoUrl: null,
              kind: 'department-group' as const,
              workers: workers.map(w => ({
                id: w.id,
                name: `${w.firstName} ${w.surname}`,
                photoUrl: w.photoUrl,
              })),
              nodeHeight,
            },
            children: [],
          };
        });
      
      const children = [...managerChildren, ...deptGroupChildren];
      
      return {
        data: {
          id: user.id,
          name: `${user.firstName} ${user.surname}`,
          role: user.role,
          department: user.department,
          photoUrl: user.photoUrl,
          kind: 'manager' as const,
          nodeHeight: MANAGER_NODE_HEIGHT,
        },
        children,
      };
    };

    let rootNode: TreeNode;
    
    if (roots.length === 0) {
      return { treeData: null, dimensions: { width: 800, height: 400, offsetX: 0 } };
    } else if (roots.length === 1) {
      const tree = buildSubtree(roots[0].id);
      if (!tree) return { treeData: null, dimensions: { width: 800, height: 400, offsetX: 0 } };
      tree.data.isRoot = true;
      rootNode = tree;
    } else {
      const managerRoots = roots.filter(r => r.role === 'manager').sort((a, b) => (a.department || '').localeCompare(b.department || ''));
      const workerRoots = roots.filter(r => r.role === 'worker').sort((a, b) => (a.department || '').localeCompare(b.department || ''));
      const sortedRoots = [...managerRoots, ...workerRoots];
      
      rootNode = {
        data: {
          id: 'company',
          name: 'AEC Electronics',
          role: 'manager',
          department: 'Managing Director',
          photoUrl: null,
          isRoot: true,
          kind: 'manager',
          nodeHeight: MANAGER_NODE_HEIGHT,
        },
        children: sortedRoots
          .map(r => buildSubtree(r.id))
          .filter((n): n is TreeNode => n !== null),
      };
    }

    const h = d3.hierarchy(rootNode);
    const maxDepth = h.height;
    const leaves = h.leaves().length;
    
    // Calculate max node height at each level for proper spacing
    const maxHeightPerLevel: number[] = [];
    h.each(node => {
      const level = node.depth;
      const height = node.data.data.nodeHeight;
      if (!maxHeightPerLevel[level] || height > maxHeightPerLevel[level]) {
        maxHeightPerLevel[level] = height;
      }
    });
    
    const avgNodeHeight = Math.max(...maxHeightPerLevel, MANAGER_NODE_HEIGHT);
    
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([NODE_WIDTH + HORIZONTAL_GAP, avgNodeHeight + VERTICAL_GAP])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.2);
    
    const tree = treeLayout(h);
    
    const nodes = tree.descendants();
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    
    // Calculate total height based on actual node heights
    let totalHeight = 100;
    const levelYPositions: number[] = [40];
    for (let i = 0; i < maxHeightPerLevel.length; i++) {
      const prevY = levelYPositions[i] || 40;
      const prevHeight = maxHeightPerLevel[i] || MANAGER_NODE_HEIGHT;
      levelYPositions[i + 1] = prevY + prevHeight + VERTICAL_GAP;
      totalHeight = levelYPositions[i + 1] + (maxHeightPerLevel[i + 1] || 0);
    }
    
    const padding = 50;
    const width = maxX - minX + NODE_WIDTH + padding * 2;
    const height = Math.max(400, totalHeight + 100);
    const offsetX = -minX + NODE_WIDTH / 2 + padding;
    
    return {
      treeData: tree,
      dimensions: { width, height, offsetX },
    };
  }, [activeUsers]);

  const totalManagers = activeUsers.filter(u => u.role === 'manager').length;
  const totalWorkers = activeUsers.filter(u => u.role === 'worker').length;

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    activeUsers.forEach(u => {
      if (u.department) depts.add(u.department);
    });
    return Array.from(depts).sort();
  }, [activeUsers]);

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
                <p className="text-sm text-muted-foreground">Managers with department-grouped teams</p>
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
        ) : treeData ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                AEC Electronics - Workforce Structure
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Managers shown individually; workers grouped by department
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {uniqueDepartments.map(dept => (
                  <div key={dept} className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getDepartmentColor(dept) }}
                    />
                    <span className="text-xs text-muted-foreground">{dept}</span>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                ref={containerRef}
                className="overflow-auto border-t"
                style={{ maxHeight: 'calc(100vh - 280px)' }}
              >
                <svg 
                  width={dimensions.width} 
                  height={dimensions.height}
                  className="min-w-full"
                >
                  <g transform={`translate(${dimensions.offsetX || 0}, 40)`}>
                    {treeData.links().map((link, i) => (
                      <Connector
                        key={i}
                        source={{ x: link.source.x, y: link.source.y }}
                        target={{ x: link.target.x, y: link.target.y }}
                        sourceHeight={link.source.data.data.nodeHeight}
                      />
                    ))}
                    
                    {treeData.descendants().map((node) => (
                      <OrgNode
                        key={node.data.data.id}
                        data={node.data.data}
                        x={node.x}
                        y={node.y}
                      />
                    ))}
                  </g>
                </svg>
              </div>
            </CardContent>
          </Card>
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
