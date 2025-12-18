import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Building2, User as UserIcon, Crown, Briefcase, ZoomIn, ZoomOut, RotateCcw, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { userApi, departmentApi } from '@/lib/api';
import type { User, Department } from '@shared/schema';
import * as d3 from 'd3-hierarchy';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';

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
const MANAGER_NODE_HEIGHT = 90;
const WORKER_ROW_HEIGHT = 36;
const DEPT_HEADER_HEIGHT = 28;
const VERTICAL_GAP = 25;
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
  'Repairs': '#f97316',
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
          className={`h-full rounded-lg border-2 shadow-md overflow-hidden ${
            isRoot ? 'border-amber-500 bg-amber-50' : 'border-primary bg-primary/5'
          }`}
        >
          {/* Department header at top */}
          <div 
            className="px-2 py-0.5 text-white text-[9px] font-medium truncate"
            style={{ backgroundColor: deptColor }}
          >
            {data.department || 'No Department'}
          </div>
          
          {/* Manager content */}
          <div className="flex items-center gap-2 p-2 pb-3">
            {data.photoUrl ? (
              <img 
                src={data.photoUrl} 
                alt={data.name} 
                className="w-9 h-9 rounded-full object-cover shrink-0" 
              />
            ) : (
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                isRoot ? 'bg-amber-500 text-white' : 'bg-primary text-white'
              }`}>
                <Crown className={isRoot ? "h-4 w-4" : "h-3.5 w-3.5"} />
              </div>
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="font-medium text-xs truncate leading-tight">{data.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{data.id}</p>
              <Badge variant="default" className="text-[9px] px-1 py-0 h-4 mt-1">Manager</Badge>
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
          <div 
            className="px-2 py-1.5 text-white text-[10px] font-semibold flex items-center gap-1"
            style={{ backgroundColor: deptColor }}
          >
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{data.department || 'Unassigned'}</span>
            <span className="ml-auto opacity-75 shrink-0">({workers.length})</span>
          </div>
          
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const buildExportSvg = () => {
    if (!treeData) return null;
    
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('width', String(dimensions.width));
    svg.setAttribute('height', String(dimensions.height));
    svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
    svg.setAttribute('xmlns', svgNs);
    
    // Add white background
    const bg = document.createElementNS(svgNs, 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#ffffff');
    svg.appendChild(bg);
    
    // Create main group with offset
    const mainGroup = document.createElementNS(svgNs, 'g');
    mainGroup.setAttribute('transform', `translate(${dimensions.offsetX}, 60)`);
    svg.appendChild(mainGroup);
    
    // Draw connecting lines first
    const links = treeData.links();
    links.forEach(link => {
      const sourceX = link.source.x;
      const sourceY = link.source.y + link.source.data.data.nodeHeight;
      const targetX = link.target.x;
      const targetY = link.target.y;
      const midY = (sourceY + targetY) / 2;
      
      const path = document.createElementNS(svgNs, 'path');
      path.setAttribute('d', `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#94a3b8');
      path.setAttribute('stroke-width', '2');
      mainGroup.appendChild(path);
    });
    
    // Draw nodes
    const nodes = treeData.descendants();
    nodes.forEach(node => {
      const d = node.data.data;
      const x = node.x - NODE_WIDTH / 2;
      const y = node.y;
      const deptColor = getDepartmentColor(d.department);
      
      const nodeGroup = document.createElementNS(svgNs, 'g');
      nodeGroup.setAttribute('transform', `translate(${x}, ${y})`);
      
      if (d.kind === 'manager') {
        // Manager node background
        const rect = document.createElementNS(svgNs, 'rect');
        rect.setAttribute('width', String(NODE_WIDTH));
        rect.setAttribute('height', String(MANAGER_NODE_HEIGHT));
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', d.isRoot ? '#fef3c7' : '#eff6ff');
        rect.setAttribute('stroke', d.isRoot ? '#f59e0b' : '#3b82f6');
        rect.setAttribute('stroke-width', '2');
        nodeGroup.appendChild(rect);
        
        // Department header bar
        const deptBar = document.createElementNS(svgNs, 'rect');
        deptBar.setAttribute('width', String(NODE_WIDTH));
        deptBar.setAttribute('height', '16');
        deptBar.setAttribute('rx', '8');
        deptBar.setAttribute('fill', deptColor);
        nodeGroup.appendChild(deptBar);
        
        // Cover bottom corners of dept bar
        const coverRect = document.createElementNS(svgNs, 'rect');
        coverRect.setAttribute('y', '8');
        coverRect.setAttribute('width', String(NODE_WIDTH));
        coverRect.setAttribute('height', '8');
        coverRect.setAttribute('fill', deptColor);
        nodeGroup.appendChild(coverRect);
        
        // Department text
        const deptText = document.createElementNS(svgNs, 'text');
        deptText.setAttribute('x', String(NODE_WIDTH / 2));
        deptText.setAttribute('y', '11');
        deptText.setAttribute('text-anchor', 'middle');
        deptText.setAttribute('fill', '#ffffff');
        deptText.setAttribute('font-size', '9');
        deptText.setAttribute('font-family', 'Arial, sans-serif');
        deptText.textContent = d.department || 'No Department';
        nodeGroup.appendChild(deptText);
        
        // Name text
        const nameText = document.createElementNS(svgNs, 'text');
        nameText.setAttribute('x', String(NODE_WIDTH / 2));
        nameText.setAttribute('y', '35');
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('fill', '#1e293b');
        nameText.setAttribute('font-size', '11');
        nameText.setAttribute('font-weight', 'bold');
        nameText.setAttribute('font-family', 'Arial, sans-serif');
        nameText.textContent = d.name.length > 22 ? d.name.substring(0, 20) + '...' : d.name;
        nodeGroup.appendChild(nameText);
        
        // ID text
        const idText = document.createElementNS(svgNs, 'text');
        idText.setAttribute('x', String(NODE_WIDTH / 2));
        idText.setAttribute('y', '48');
        idText.setAttribute('text-anchor', 'middle');
        idText.setAttribute('fill', '#64748b');
        idText.setAttribute('font-size', '9');
        idText.setAttribute('font-family', 'Arial, sans-serif');
        idText.textContent = d.id;
        nodeGroup.appendChild(idText);
        
        // Manager badge
        const badgeRect = document.createElementNS(svgNs, 'rect');
        badgeRect.setAttribute('x', String((NODE_WIDTH - 50) / 2));
        badgeRect.setAttribute('y', '58');
        badgeRect.setAttribute('width', '50');
        badgeRect.setAttribute('height', '16');
        badgeRect.setAttribute('rx', '4');
        badgeRect.setAttribute('fill', '#3b82f6');
        nodeGroup.appendChild(badgeRect);
        
        const badgeText = document.createElementNS(svgNs, 'text');
        badgeText.setAttribute('x', String(NODE_WIDTH / 2));
        badgeText.setAttribute('y', '69');
        badgeText.setAttribute('text-anchor', 'middle');
        badgeText.setAttribute('fill', '#ffffff');
        badgeText.setAttribute('font-size', '9');
        badgeText.setAttribute('font-family', 'Arial, sans-serif');
        badgeText.textContent = 'Manager';
        nodeGroup.appendChild(badgeText);
        
      } else if (d.kind === 'department-group') {
        const workers = d.workers || [];
        const totalHeight = DEPT_HEADER_HEIGHT + workers.length * WORKER_ROW_HEIGHT + 4;
        
        // Background
        const rect = document.createElementNS(svgNs, 'rect');
        rect.setAttribute('width', String(NODE_WIDTH));
        rect.setAttribute('height', String(totalHeight));
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('stroke', deptColor);
        rect.setAttribute('stroke-width', '2');
        nodeGroup.appendChild(rect);
        
        // Department header
        const headerRect = document.createElementNS(svgNs, 'rect');
        headerRect.setAttribute('width', String(NODE_WIDTH));
        headerRect.setAttribute('height', String(DEPT_HEADER_HEIGHT));
        headerRect.setAttribute('rx', '8');
        headerRect.setAttribute('fill', deptColor);
        nodeGroup.appendChild(headerRect);
        
        // Cover bottom corners
        const coverRect = document.createElementNS(svgNs, 'rect');
        coverRect.setAttribute('y', '12');
        coverRect.setAttribute('width', String(NODE_WIDTH));
        coverRect.setAttribute('height', '16');
        coverRect.setAttribute('fill', deptColor);
        nodeGroup.appendChild(coverRect);
        
        // Department name
        const deptText = document.createElementNS(svgNs, 'text');
        deptText.setAttribute('x', '8');
        deptText.setAttribute('y', '18');
        deptText.setAttribute('fill', '#ffffff');
        deptText.setAttribute('font-size', '10');
        deptText.setAttribute('font-weight', 'bold');
        deptText.setAttribute('font-family', 'Arial, sans-serif');
        deptText.textContent = `${d.department || 'Unassigned'} (${workers.length})`;
        nodeGroup.appendChild(deptText);
        
        // Worker names
        workers.forEach((worker, idx) => {
          const workerY = DEPT_HEADER_HEIGHT + idx * WORKER_ROW_HEIGHT + 22;
          
          // Worker circle
          const circle = document.createElementNS(svgNs, 'circle');
          circle.setAttribute('cx', '16');
          circle.setAttribute('cy', String(workerY - 4));
          circle.setAttribute('r', '10');
          circle.setAttribute('fill', deptColor);
          circle.setAttribute('opacity', '0.2');
          nodeGroup.appendChild(circle);
          
          // Worker name
          const workerText = document.createElementNS(svgNs, 'text');
          workerText.setAttribute('x', '32');
          workerText.setAttribute('y', String(workerY));
          workerText.setAttribute('fill', '#334155');
          workerText.setAttribute('font-size', '10');
          workerText.setAttribute('font-family', 'Arial, sans-serif');
          workerText.textContent = worker.name.length > 18 ? worker.name.substring(0, 16) + '...' : worker.name;
          nodeGroup.appendChild(workerText);
        });
      }
      
      mainGroup.appendChild(nodeGroup);
    });
    
    return svg;
  };
  
  const handleExportPDF = async () => {
    if (!treeData) {
      toast({ title: "Error", description: "Unable to export chart", variant: "destructive" });
      return;
    }
    
    setIsExporting(true);
    try {
      // Build pure SVG for export
      const exportSvg = buildExportSvg();
      if (!exportSvg) throw new Error('Failed to build export SVG');
      
      const svgWidth = dimensions.width;
      const svgHeight = dimensions.height;
      
      // Serialize SVG to string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(exportSvg);
      
      // Add XML declaration
      svgString = '<?xml version="1.0" encoding="UTF-8"?>' + svgString;
      
      // Create blob and URL
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Create image and load SVG
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load SVG'));
        img.src = url;
      });
      
      // Create canvas and draw
      const canvas = document.createElement('canvas');
      const scale = 2; // Higher quality
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
      
      // Clean up blob URL
      URL.revokeObjectURL(url);
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF (landscape orientation for org chart)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4',
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate scaling to fit the chart
      const pdfScale = Math.min((pageWidth - 40) / svgWidth, (pageHeight - 60) / svgHeight);
      const scaledWidth = svgWidth * pdfScale;
      const scaledHeight = svgHeight * pdfScale;
      
      // Center the image
      const x = (pageWidth - scaledWidth) / 2;
      const y = 40;
      
      // Add title
      pdf.setFontSize(16);
      pdf.text('AEC Electronics - Organization Chart', pageWidth / 2, 25, { align: 'center' });
      
      // Add the image
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      
      // Add footer with date
      pdf.setFontSize(10);
      const today = new Date().toLocaleDateString('en-GB');
      pdf.text(`Generated: ${today}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      
      // Download PDF
      pdf.save('AECE-Organization-Chart.pdf');
      
      toast({ title: "Success", description: "Organization chart exported to PDF" });
      
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({ title: "Error", description: "Failed to export PDF. Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

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
      
      const managerChildren = managerReports
        .sort((a, b) => (a.department || '').localeCompare(b.department || ''))
        .map(u => buildSubtree(u.id, new Set(visited)))
        .filter((n): n is TreeNode => n !== null);
      
      const workersByDept = new Map<string, User[]>();
      workerReports.forEach(w => {
        const dept = w.department || 'Unassigned';
        if (!workersByDept.has(dept)) workersByDept.set(dept, []);
        workersByDept.get(dept)!.push(w);
      });
      
      const deptGroupChildren: TreeNode[] = Array.from(workersByDept.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dept, workers]) => {
          const nodeHeight = DEPT_HEADER_HEIGHT + workers.length * WORKER_ROW_HEIGHT + 4;
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
    
    // Find max node height across all nodes
    let maxNodeHeight = MANAGER_NODE_HEIGHT;
    h.each(node => {
      if (node.data.data.nodeHeight > maxNodeHeight) {
        maxNodeHeight = node.data.data.nodeHeight;
      }
    });
    
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([NODE_WIDTH + HORIZONTAL_GAP, maxNodeHeight + VERTICAL_GAP])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.2);
    
    const tree = treeLayout(h);
    
    const nodes = tree.descendants();
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const maxY = Math.max(...nodes.map(n => n.y + n.data.data.nodeHeight));
    
    const padding = 60;
    const width = maxX - minX + NODE_WIDTH + padding * 2;
    const height = maxY + padding * 2;
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

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.4));
  const handleZoomReset = () => setZoom(1);

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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    AEC Electronics - Workforce Structure
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Managers shown individually; workers grouped by department
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.4}
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleZoomIn}
                    disabled={zoom >= 2}
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleZoomReset}
                    data-testid="button-zoom-reset"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <div className="h-6 w-px bg-slate-200 mx-1" />
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    data-testid="button-export-pdf"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
                </div>
              </div>
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
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              >
                <svg 
                  ref={svgRef}
                  width={dimensions.width * zoom} 
                  height={dimensions.height * zoom}
                  className="min-w-full"
                  style={{ minHeight: '400px', backgroundColor: '#ffffff' }}
                >
                  <g transform={`scale(${zoom}) translate(${dimensions.offsetX || 0}, 40)`}>
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
