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
import { Switch } from "@/components/ui/switch";
import { userApi, departmentApi, userGroupApi, leaveBalanceApi, employeeTypeApi, contractHistoryApi, faceDescriptorApi, orgPositionApi } from '@/lib/api';
import type { User, Department, UserGroup, LeaveBalance, EmployeeType, OrgPosition } from '@shared/schema';
import { Plus, Pencil, Trash2, Mail, Camera, Loader2, CheckCircle2, UserCog, Shield, Check, X, Search, UserX, Network, ChevronDown, ChevronRight, ArrowUp, ArrowDown, ChevronsUpDown, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/lib/auth-context';
import WebcamCapture from '@/components/WebcamCapture';
import MultiAngleFaceCapture from '@/components/MultiAngleFaceCapture';
import { loadFaceModels, extractFaceDescriptorFromBase64, descriptorToJson } from '@/lib/face-recognition';
import { formatDateForDisplay, getEmploymentDuration, generatePassword, isValidDateFormat, parseDateFromDisplay } from './utils';

export default function PersonnelSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentApi.getAll,
  });

  const { data: userGroups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: userGroupApi.getAll,
  });

  const { data: employeeTypes = [] } = useQuery({
    queryKey: ['employeeTypes'],
    queryFn: employeeTypeApi.getAll,
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: () => leaveBalanceApi.getAll(),
  });

  const { data: orgPositions = [] } = useQuery<OrgPosition[]>({
    queryKey: ['org-positions'],
    queryFn: () => orgPositionApi.getAll(),
  });

  // Employee Search State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState<string>('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'active' | 'terminated'>('active');

  type SortField = 'id' | 'name' | 'department' | 'tenure' | 'leave' | 'role';
  type SortDir = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="inline h-3 w-3 ml-1" />
      : <ArrowDown className="inline h-3 w-3 ml-1" />;
  };
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const toggleEmployeeExpanded = (id: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // User Management State
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isMultiAngleCapture, setIsMultiAngleCapture] = useState(false);
  const [extractingFace, setExtractingFace] = useState(false);
  const [faceExtracted, setFaceExtracted] = useState(false);
  const [pendingMultiAnglePhotos, setPendingMultiAnglePhotos] = useState<Array<{ angle: string; image: string; descriptor: string | null }>>([]);

  // Admin User Creation State
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminData, setAdminData] = useState<{
    firstName: string;
    surname: string;
    email: string;
    password: string;
    userGroupId?: number;
  }>({ firstName: '', surname: '', email: '', password: '' });

  // Employee Balance View State
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [selectedEmployeeForBalance, setSelectedEmployeeForBalance] = useState<User | null>(null);

  // Contract Management State
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [contractActionUser, setContractActionUser] = useState<User | null>(null);
  const [contractAction, setContractAction] = useState<'extend' | 'convert'>('extend');
  const [contractNewEndDate, setContractNewEndDate] = useState('');
  const [contractNewTypeId, setContractNewTypeId] = useState<number | null>(null);
  const [contractReason, setContractReason] = useState('');

  // Termination State
  const [isTerminationDialogOpen, setIsTerminationDialogOpen] = useState(false);
  const [terminationUser, setTerminationUser] = useState<User | null>(null);
  const [terminationDate, setTerminationDate] = useState('');

  const saveAdditionalFaceDescriptors = async (userId: string) => {
    if (pendingMultiAnglePhotos.length === 0) return;
    
    for (const photo of pendingMultiAnglePhotos) {
      if (photo.descriptor) {
        try {
          await faceDescriptorApi.create({
            userId,
            descriptor: photo.descriptor,
            label: photo.angle,
            photoData: photo.image,
          });
        } catch (err) {
          console.error(`Failed to save ${photo.angle} descriptor:`, err);
        }
      }
    }
    setPendingMultiAnglePhotos([]);
  };

  const createUserMutation = useMutation({
    mutationFn: userApi.create,
    onSuccess: async (createdUser) => {
      if (createdUser?.id && pendingMultiAnglePhotos.length > 0) {
        await saveAdditionalFaceDescriptors(createdUser.id);
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User Created", description: "User has been added successfully." });
      setIsUserDialogOpen(false);
      setCurrentUser({});
      setIsEditing(false);
      setIsCapturingPhoto(false);
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      toast({ variant: "destructive", title: "Error Creating User", description: error.message || "Failed to create user. Please try again." });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => userApi.update(id, data),
    onSuccess: async (_, variables) => {
      if (variables?.id && pendingMultiAnglePhotos.length > 0) {
        await saveAdditionalFaceDescriptors(variables.id);
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User Updated", description: "User has been updated successfully." });
      setIsUserDialogOpen(false);
      setCurrentUser({});
      setIsEditing(false);
      setIsCapturingPhoto(false);
    },
    onError: (error: any) => {
      console.error('Update user error:', error);
      toast({ variant: "destructive", title: "Error Updating User", description: error.message || "Failed to update user. Please try again." });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: userApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User Deleted", description: "User has been removed from the system." });
    },
  });

  const updateLeaveBalanceMutation = useMutation({
    mutationFn: ({ id, total }: { id: number; total: number }) => leaveBalanceApi.update(id, { total }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    },
  });

  const createLeaveBalanceMutation = useMutation({
    mutationFn: (data: { userId: string; leaveType: string; total: number }) => leaveBalanceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      toast({ title: "Leave Allocated", description: "Leave balance has been created." });
    },
  });

  const handleSaveUser = () => {
    if (!currentUser.firstName || !currentUser.surname || !currentUser.id) {
      toast({ variant: "destructive", title: "Error", description: "First name, surname, and ID are required" });
      return;
    }
    
    const role = currentUser.role || 'worker';
    
    if (role === 'worker' && !currentUser.department) {
      toast({ variant: "destructive", title: "Error", description: "Department is required for employees" });
      return;
    }
    
    if (currentUser.userGroupId && !currentUser.email) {
      toast({ variant: "destructive", title: "Error", description: "Email is required for admin users" });
      return;
    }
    
    if (currentUser.userGroupId && !isEditing && !currentUser.password) {
      toast({ variant: "destructive", title: "Error", description: "Password is required for new admin users" });
      return;
    }

    const userData = { 
      ...currentUser, 
      role,
      photoUrl: currentUser.photoUrl || 'https://github.com/shadcn.png',
      employeeTypeId: currentUser.employeeTypeId || null,
      nationalId: currentUser.nationalId || null,
      taxNumber: currentUser.taxNumber || null,
      nextOfKin: currentUser.nextOfKin || null,
      emergencyNumber: currentUser.emergencyNumber || null,
      startDate: currentUser.startDate || null,
      userGroupId: currentUser.userGroupId || null,
      managerId: currentUser.managerId || null,
      secondManagerId: currentUser.secondManagerId || null,
      orgPositionId: currentUser.orgPositionId || null,
      exclude: currentUser.exclude || false,
      attendanceRequired: currentUser.attendanceRequired !== false,
      nickname: currentUser.nickname || null,
      terminationDate: currentUser.terminationDate || null,
      contractEndDate: currentUser.contractEndDate || null,
      adminRole: currentUser.userGroupId ? (currentUser.adminRole || 'manager') : null,
    };

    if (isEditing) {
      updateUserMutation.mutate(userData);
    } else {
      createUserMutation.mutate(userData);
    }
  };

  const handlePhotoCapture = async (imageSrc: string) => {
    setCurrentUser({ ...currentUser, photoUrl: imageSrc });
    setIsCapturingPhoto(false);
    setExtractingFace(true);
    setFaceExtracted(false);
    
    try {
      await loadFaceModels();
      const descriptor = await extractFaceDescriptorFromBase64(imageSrc);
      
      if (descriptor) {
        const faceDescriptor = descriptorToJson(descriptor);
        setCurrentUser(prev => ({ ...prev, photoUrl: imageSrc, faceDescriptor }));
        setFaceExtracted(true);
        toast({ title: "Face Detected", description: "Identity verified for recognition." });
      } else {
        toast({ variant: "destructive", title: "No Face Detected", description: "Please ensure your face is clearly visible." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to process face." });
    } finally {
      setExtractingFace(false);
    }
  };

  const handleMultiAngleCaptureComplete = async (
    photos: Array<{ angle: string; image: string; descriptor: string | null }>,
    primaryPhoto: string,
    primaryDescriptor: string
  ) => {
    setCurrentUser(prev => ({ 
      ...prev, 
      photoUrl: primaryPhoto, 
      faceDescriptor: primaryDescriptor 
    }));
    setIsMultiAngleCapture(false);
    setFaceExtracted(true);
    
    const additionalPhotos = photos.filter(p => p.descriptor && p.angle !== 'center');
    setPendingMultiAnglePhotos(additionalPhotos);
    
    const capturedCount = photos.filter(p => p.descriptor).length;
    toast({ 
      title: "Face Registration Complete", 
      description: `Captured ${capturedCount} face angles for improved recognition accuracy.` 
    });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleResendCredentials = async (id: string) => {
    try {
      const result = await userApi.resendCredentials(id);
      toast({ title: "Email Sent", description: result.message });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send credentials email" });
    }
  };

  const handleOpenEdit = (user: User) => {
    setCurrentUser(user);
    setIsEditing(true);
    setIsUserDialogOpen(true);
    setFaceExtracted(!!user.faceDescriptor);
    setExtractingFace(false);
    setIsCapturingPhoto(false);
  };

  const handleOpenCreate = () => {
    const aecePrefixRegex = /^AECE(\d+)$/i;
    let maxNum = 0;
    users.forEach(u => {
      const match = u.id.match(aecePrefixRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    const nextId = `AECE${String(nextNum).padStart(4, '0')}`;

    setCurrentUser({ id: nextId });
    setIsEditing(false);
    setIsUserDialogOpen(true);
    setFaceExtracted(false);
    setExtractingFace(false);
    setIsCapturingPhoto(false);
  };

  const handleContractAction = async () => {
    if (!contractActionUser || !user) return;
    
    try {
      const previousType = employeeTypes.find(t => t.id === contractActionUser.employeeTypeId);
      const newType = contractNewTypeId ? employeeTypes.find(t => t.id === contractNewTypeId) : null;
      
      if (contractAction === 'extend') {
        if (!contractNewEndDate) {
          toast({ variant: "destructive", title: "Error", description: "New end date is required for contract extension" });
          return;
        }
        
        await userApi.update(contractActionUser.id, { contractEndDate: contractNewEndDate });
        
        await contractHistoryApi.create(contractActionUser.id, {
          action: 'extended',
          previousEmployeeTypeId: contractActionUser.employeeTypeId,
          newEmployeeTypeId: contractActionUser.employeeTypeId,
          previousEndDate: contractActionUser.contractEndDate,
          newEndDate: contractNewEndDate,
          reason: contractReason || 'Contract extended',
          performedBy: user.id,
        });
        
        toast({ title: "Success", description: "Contract extended successfully" });
      } else {
        if (!contractNewTypeId) {
          toast({ variant: "destructive", title: "Error", description: "Please select a new employee type" });
          return;
        }
        
        const isNewTypePermanent = newType?.isPermanent === 'yes';
        const updateData: Partial<User> = { 
          employeeTypeId: contractNewTypeId,
          contractEndDate: isNewTypePermanent ? null : (contractNewEndDate || null),
        };
        
        await userApi.update(contractActionUser.id, updateData);
        
        await contractHistoryApi.create(contractActionUser.id, {
          action: 'converted',
          previousEmployeeTypeId: contractActionUser.employeeTypeId,
          newEmployeeTypeId: contractNewTypeId,
          previousEndDate: contractActionUser.contractEndDate,
          newEndDate: isNewTypePermanent ? null : contractNewEndDate,
          reason: contractReason || `Converted to ${newType?.name}`,
          performedBy: user.id,
        });
        
        toast({ title: "Success", description: `Personnel converted to ${newType?.name}` });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsContractDialogOpen(false);
      setContractActionUser(null);
    } catch (error) {
      console.error('Contract action error:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update contract" });
    }
  };

  const handleSaveAdmin = () => {
    if (!adminData.firstName || !adminData.surname || !adminData.email || !adminData.password) {
      toast({ variant: "destructive", title: "Error", description: "First name, surname, email and password are required" });
      return;
    }

    createUserMutation.mutate({
      id: `ADM${Date.now()}`,
      firstName: adminData.firstName,
      surname: adminData.surname,
      email: adminData.email,
      password: adminData.password,
      role: 'manager',
      adminRole: 'manager',
      userGroupId: adminData.userGroupId,
    }, {
      onSuccess: () => {
        setIsAdminDialogOpen(false);
        setAdminData({ firstName: '', surname: '', email: '', password: '' });
        toast({ title: "Admin Created", description: `Admin user created. Login credentials have been sent to ${adminData.email}` });
      }
    });
  };

  const handleOpenCreateAdmin = () => {
    setAdminData({
      firstName: '',
      surname: '',
      email: '',
      password: generatePassword(),
      userGroupId: undefined,
    });
    setIsAdminDialogOpen(true);
  };

  const filteredUsers = users
    .filter(u => {
      if (employeeStatusFilter === 'active') return !u.terminationDate;
      if (employeeStatusFilter === 'terminated') return !!u.terminationDate;
      return true;
    })
    .filter(u => {
      if (!employeeDepartmentFilter) return true;
      return u.department?.toString() === employeeDepartmentFilter;
    })
    .filter(u => {
      if (!employeeSearch) return true;
      const search = employeeSearch.toLowerCase();
      return (
        u.firstName.toLowerCase().includes(search) ||
        u.surname.toLowerCase().includes(search) ||
        u.id.toLowerCase().includes(search) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.mobile && u.mobile.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'id':
          return dir * a.id.localeCompare(b.id);
        case 'name':
          return dir * `${a.surname} ${a.firstName}`.localeCompare(`${b.surname} ${b.firstName}`);
        case 'department':
          return dir * (a.department || '').localeCompare(b.department || '');
        case 'tenure': {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dir * (aDate - bDate);
        }
        case 'leave': {
          const aBalance = leaveBalances.filter((lb: LeaveBalance) => lb.userId === a.id).reduce((s: number, lb: LeaveBalance) => s + (lb.total - lb.taken - lb.pending), 0);
          const bBalance = leaveBalances.filter((lb: LeaveBalance) => lb.userId === b.id).reduce((s: number, lb: LeaveBalance) => s + (lb.total - lb.taken - lb.pending), 0);
          return dir * (aBalance - bBalance);
        }
        case 'role':
          return dir * (a.role || '').localeCompare(b.role || '');
        default:
          return 0;
      }
    });

  const handleExportPdf = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const usableWidth = pageWidth - margin * 2;
    const now = new Date();
    const generatedStr = now.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

    const filterParts: string[] = [];
    if (employeeStatusFilter !== 'all') filterParts.push(`Status: ${employeeStatusFilter}`);
    if (employeeDepartmentFilter) filterParts.push(`Department: ${employeeDepartmentFilter}`);
    if (employeeSearch) filterParts.push(`Search: "${employeeSearch}"`);
    const filterStr = filterParts.length > 0 ? filterParts.join(' | ') : 'All employees';

    // Title block
    pdf.setFillColor(30, 41, 59);
    pdf.rect(0, 0, pageWidth, 28, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AECE Checkpoint', margin, 11);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Employee List', margin, 18);
    pdf.setFontSize(8);
    pdf.text(`Generated: ${generatedStr}   |   Filter: ${filterStr}   |   Total: ${filteredUsers.length}`, margin, 24);
    pdf.setTextColor(0, 0, 0);

    // Column layout (portrait 182mm wide)
    const col = {
      id:      margin,
      name:    margin + 22,
      dept:    margin + 68,
      role:    margin + 105,
      start:   margin + 124,
      tenure:  margin + 147,
    };
    // Row 2 columns
    const col2 = {
      label:   margin + 4,
      natId:   margin + 4,
      tax:     margin + 55,
      mobile:  margin + 106,
      emergency: margin + 4,
    };

    let y = 36;
    let pageNum = 1;

    const drawHeader = () => {
      pdf.setFillColor(71, 85, 105);
      pdf.rect(margin, y - 5, usableWidth, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('EMP ID', col.id, y);
      pdf.text('FULL NAME', col.name, y);
      pdf.text('DEPARTMENT', col.dept, y);
      pdf.text('ROLE', col.role, y);
      pdf.text('START DATE', col.start, y);
      pdf.text('TENURE', col.tenure, y);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      y += 4;
    };

    const addFooter = () => {
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text('AECE Checkpoint — Confidential', margin, pageHeight - 6);
      pdf.text(`Page ${pageNum}`, pageWidth - margin - 10, pageHeight - 6);
      pdf.setTextColor(0, 0, 0);
    };

    drawHeader();

    filteredUsers.forEach((emp, idx) => {
      const rowHeight = 22;
      if (y + rowHeight > pageHeight - 12) {
        addFooter();
        pdf.addPage();
        pageNum++;
        y = 20;
        drawHeader();
      }

      // Alternating row background
      if (idx % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(margin, y - 1, usableWidth, rowHeight, 'F');

      // Thin separator line
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y - 1, margin + usableWidth, y - 1);

      const empBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === emp.id);
      const totalAvailable = empBalances.reduce((sum: number, b: LeaveBalance) => sum + (b.total - b.taken - b.pending), 0);
      const leaveStr = empBalances.length > 0 ? `${totalAvailable} days` : '-';

      // --- Row 1: main info ---
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text(emp.id, col.id, y + 4);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const fullName = `${emp.firstName} ${emp.surname}`;
      pdf.text(fullName.length > 20 ? fullName.substring(0, 19) + '...' : fullName, col.name, y + 4);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      const dept = emp.department || '-';
      pdf.text(dept.length > 17 ? dept.substring(0, 16) + '...' : dept, col.dept, y + 4);
      pdf.text(emp.role || '-', col.role, y + 4);
      pdf.text(emp.startDate ? formatDateForDisplay(emp.startDate) : '-', col.start, y + 4);
      pdf.text(getEmploymentDuration(emp.startDate), col.tenure, y + 4);

      // Leave badge
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Leave: ${leaveStr}`, col.tenure, y + 10);

      // --- Row 2: secondary info ---
      pdf.setFontSize(7);
      pdf.setTextColor(80, 80, 80);

      // National ID
      pdf.setFont('helvetica', 'bold');
      pdf.text('ID No:', col2.natId, y + 10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(emp.nationalId || '-', col2.natId + 11, y + 10);

      // Tax number
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tax No:', col2.tax, y + 10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(emp.taxNumber || '-', col2.tax + 13, y + 10);

      // Mobile
      pdf.setFont('helvetica', 'bold');
      pdf.text('Mobile:', col2.mobile, y + 10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(emp.mobile || '-', col2.mobile + 13, y + 10);

      // Row 3: Emergency contact person + contact number
      const emgColLabel = margin + 4;
      const emgColNoLabel = margin + 100;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Emergency Contact:', emgColLabel, y + 15);
      pdf.setFont('helvetica', 'normal');
      const nextOfKinStr = emp.nextOfKin || '-';
      pdf.text(nextOfKinStr.length > 23 ? nextOfKinStr.substring(0, 22) + '...' : nextOfKinStr, emgColLabel + 31, y + 15);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Contact No:', emgColNoLabel, y + 15);
      pdf.setFont('helvetica', 'normal');
      pdf.text(emp.emergencyNumber || '-', emgColNoLabel + 19, y + 15);

      pdf.setTextColor(0, 0, 0);
      y += rowHeight;
    });

    addFooter();

    const date = now.toISOString().split('T')[0];
    pdf.save(`employee-list-${date}.pdf`);
    toast({ title: 'PDF Exported', description: `${filteredUsers.length} employee(s) exported.` });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900">Personnel</h1>
        <p className="text-muted-foreground">Manage personnel access, IDs, and leave balances</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Personnel</CardTitle>
              <CardDescription>Manage personnel access, IDs, and leave balances</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOpenCreateAdmin} variant="outline" className="btn-industrial">
                <Shield className="mr-2 h-4 w-4" /> Add Admin
              </Button>
              <Button variant="outline" onClick={handleExportPdf} data-testid="button-export-pdf">
                <FileText className="mr-2 h-4 w-4" /> Export PDF
              </Button>
              <Button onClick={handleOpenCreate} className="btn-industrial bg-primary text-white">
                <Plus className="mr-2 h-4 w-4" /> Add Person
              </Button>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, email, or mobile..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="pl-8 max-w-sm"
                  data-testid="employee-search"
                />
              </div>
            </div>
            <Select value={employeeDepartmentFilter || 'all'} onValueChange={(v) => setEmployeeDepartmentFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40" data-testid="employee-dept-filter">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d: Department) => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employeeStatusFilter} onValueChange={(v: 'all' | 'active' | 'terminated') => setEmployeeStatusFilter(v)}>
              <SelectTrigger className="w-32" data-testid="employee-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-slate-50" onClick={() => handleSort('id')} data-testid="sort-id">
                  ID Number <SortIcon field="id" />
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-slate-50" onClick={() => handleSort('name')} data-testid="sort-name">
                  Name <SortIcon field="name" />
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-slate-50" onClick={() => handleSort('department')} data-testid="sort-department">
                  Department <SortIcon field="department" />
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-slate-50" onClick={() => handleSort('tenure')} data-testid="sort-tenure">
                  Tenure <SortIcon field="tenure" />
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-slate-50" onClick={() => handleSort('leave')} data-testid="sort-leave">
                  Leave Balance <SortIcon field="leave" />
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-slate-50" onClick={() => handleSort('role')} data-testid="sort-role">
                  Role <SortIcon field="role" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((emp) => {
                const empBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === emp.id);
                const totalAvailable = empBalances.reduce((sum: number, b: LeaveBalance) => sum + (b.total - b.taken - b.pending), 0);
                const isExpanded = expandedEmployees.has(emp.id);
                return (
                  <React.Fragment key={emp.id}>
                    <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => toggleEmployeeExpanded(emp.id)}>
                      <TableCell className="w-8">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-medium">{emp.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-100">
                            <img src={emp.photoUrl || 'https://github.com/shadcn.png'} alt={`${emp.firstName} ${emp.surname}`} className="h-full w-full object-cover" />
                          </div>
                          {emp.firstName} {emp.surname}
                        </div>
                      </TableCell>
                      <TableCell>{emp.department || '-'}</TableCell>
                      <TableCell>
                        <span className="text-sm" title={emp.startDate ? `Started: ${formatDateForDisplay(emp.startDate)}` : 'Start date not set'}>
                          {getEmploymentDuration(emp.startDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {empBalances.length > 0 ? (
                          <Badge variant={totalAvailable > 5 ? 'default' : totalAvailable > 0 ? 'secondary' : 'destructive'}>
                            {totalAvailable} days available
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp.role === 'manager' ? 'default' : 'secondary'}>
                          {emp.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(emp)} title="Edit" data-testid={`button-edit-${emp.id}`}>
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        {!emp.terminationDate ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setTerminationUser(emp);
                              setTerminationDate(new Date().toISOString().split('T')[0]);
                              setIsTerminationDialogOpen(true);
                            }}
                            title="Terminate"
                            data-testid={`button-terminate-${emp.id}`}
                          >
                            <UserX className="h-4 w-4 text-amber-600" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              updateUserMutation.mutate({ ...emp, terminationDate: null });
                              toast({ title: "Personnel Reactivated", description: `${emp.firstName} is now active again.` });
                            }}
                            title="Reactivate"
                            data-testid={`button-reactivate-${emp.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(emp.id)} title="Delete" data-testid={`button-delete-${emp.id}`}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${emp.id}-expanded`} className="bg-slate-50">
                        <TableCell colSpan={8} className="py-4">
                          <div className="pl-8 space-y-4">
                            <div className="flex flex-wrap gap-8 p-3 bg-white rounded-lg border mb-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Start Date</p>
                                <p className="font-medium">{emp.startDate ? formatDateForDisplay(emp.startDate) : 'Not set'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Employment Duration</p>
                                <p className="font-medium">{getEmploymentDuration(emp.startDate)}</p>
                              </div>
                              {emp.employeeTypeId && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Employee Type</p>
                                  <p className="font-medium">{employeeTypes.find(t => t.id === emp.employeeTypeId)?.name || '-'}</p>
                                </div>
                              )}
                              {emp.managerId && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Manager</p>
                                  <p className="font-medium">
                                    {(() => {
                                      const manager = users.find(u => u.id === emp.managerId);
                                      return manager ? `${manager.firstName} ${manager.surname}` : '-';
                                    })()}
                                  </p>
                                </div>
                              )}
                              {emp.secondManagerId && (
                                <div>
                                  <p className="text-xs text-muted-foreground">2nd Manager</p>
                                  <p className="font-medium">
                                    {(() => {
                                      const manager = users.find(u => u.id === emp.secondManagerId);
                                      return manager ? `${manager.firstName} ${manager.surname}` : '-';
                                    })()}
                                  </p>
                                </div>
                              )}
                              {emp.terminationDate && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Termination Date</p>
                                  <p className="font-medium text-red-600">{formatDateForDisplay(emp.terminationDate)}</p>
                                </div>
                              )}
                              {(() => {
                                const empType = employeeTypes.find(t => t.id === emp.employeeTypeId);
                                if (empType && empType.isPermanent === 'no') {
                                  const isExpired = emp.contractEndDate && new Date(emp.contractEndDate) < new Date();
                                  return (
                                    <>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Contract End Date</p>
                                        <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                                          {emp.contractEndDate ? formatDateForDisplay(emp.contractEndDate) : 'Not set'}
                                          {isExpired && <span className="ml-2 text-red-600 text-xs">(Expired)</span>}
                                        </p>
                                      </div>
                                      <div className="flex items-end">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setContractActionUser(emp);
                                            setContractAction('extend');
                                            setContractNewEndDate('');
                                            setContractNewTypeId(null);
                                            setContractReason('');
                                            setIsContractDialogOpen(true);
                                          }}
                                          data-testid={`button-manage-contract-${emp.id}`}
                                        >
                                          Extend / Convert
                                        </Button>
                                      </div>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            <p className="text-sm font-medium text-slate-700">Leave Balance Details</p>
                            <div className="grid grid-cols-4 gap-4">
                              {['Annual Leave', 'Sick Leave', 'Family Responsibility', 'Study Leave'].map(leaveType => {
                                const balance = empBalances.find((b: LeaveBalance) => b.leaveType === leaveType);
                                const available = balance ? balance.total - balance.taken - balance.pending : 0;
                                return (
                                  <div key={leaveType} className="p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-muted-foreground mb-1">{leaveType}</p>
                                    {balance ? (
                                      <>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge variant={available > 0 ? 'default' : 'destructive'} className="text-lg">
                                            {available}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">available</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                          <div className="flex justify-between">
                                            <span>Total:</span>
                                            <Input 
                                              type="number"
                                              value={balance.total}
                                              onChange={(e) => {
                                                const newTotal = parseInt(e.target.value) || 0;
                                                updateLeaveBalanceMutation.mutate({ id: balance.id, total: newTotal });
                                              }}
                                              className="w-16 h-6 text-xs text-right"
                                              min={0}
                                            />
                                          </div>
                                          <div className="flex justify-between"><span>Taken:</span><span>{balance.taken}</span></div>
                                          <div className="flex justify-between"><span>Pending:</span><span>{balance.pending}</span></div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Not allocated</p>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="w-full text-xs"
                                          onClick={() => createLeaveBalanceMutation.mutate({ 
                                            userId: emp.id, 
                                            leaveType, 
                                            total: leaveType === 'Annual Leave' ? 21 : leaveType === 'Sick Leave' ? 30 : 3 
                                          })}
                                        >
                                          <Plus className="h-3 w-3 mr-1" /> Allocate
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No personnel found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {users.filter(u => u.terminationDate).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-amber-600" />
              Terminated Personnel
            </CardTitle>
            <CardDescription>
              {users.filter(u => u.terminationDate).length} former employee{users.filter(u => u.terminationDate).length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Termination Date</TableHead>
                  <TableHead>Employment Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.filter(u => u.terminationDate).map((emp) => (
                  <TableRow key={emp.id} className="bg-slate-50/50">
                    <TableCell className="font-mono font-medium text-muted-foreground">{emp.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-100 opacity-60">
                          <img src={emp.photoUrl || 'https://github.com/shadcn.png'} alt={`${emp.firstName} ${emp.surname}`} className="h-full w-full object-cover grayscale" />
                        </div>
                        <span className="text-muted-foreground">{emp.firstName} {emp.surname}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{emp.department}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-amber-400 text-amber-700">
                        {emp.terminationDate ? formatDateForDisplay(emp.terminationDate) : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.startDate && emp.terminationDate ? (
                        (() => {
                          const start = new Date(emp.startDate);
                          const end = new Date(emp.terminationDate);
                          const years = end.getFullYear() - start.getFullYear();
                          const months = end.getMonth() - start.getMonth();
                          const totalMonths = years * 12 + months;
                          if (totalMonths >= 12) {
                            const y = Math.floor(totalMonths / 12);
                            const m = totalMonths % 12;
                            return m > 0 ? `${y}y ${m}m` : `${y} year${y > 1 ? 's' : ''}`;
                          }
                          return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
                        })()
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(emp)} title="View Details" data-testid={`button-edit-terminated-${emp.id}`}>
                        <Pencil className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(emp.id)} title="Delete Permanently" data-testid={`button-delete-terminated-${emp.id}`}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personnel Overview</CardTitle>
          <CardDescription>High-level summary of personnel status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="grid grid-cols-2 gap-4 col-span-2">
              {['Annual Leave', 'Sick Leave', 'Family Responsibility'].map(leaveType => {
                const typeBalances = leaveBalances.filter((b: LeaveBalance) => b.leaveType === leaveType);
                const totalDays = typeBalances.reduce((sum: number, b: LeaveBalance) => sum + b.total, 0);
                const takenDays = typeBalances.reduce((sum: number, b: LeaveBalance) => sum + b.taken, 0);
                const pendingDays = typeBalances.reduce((sum: number, b: LeaveBalance) => sum + b.pending, 0);
                return (
                  <div key={leaveType} className="p-4 bg-slate-50 rounded-lg border">
                    <p className="text-sm text-muted-foreground">{leaveType}</p>
                    <p className="text-2xl font-bold">{totalDays - takenDays - pendingDays}</p>
                    <p className="text-xs text-muted-foreground">Available ({takenDays} taken, {pendingDays} pending)</p>
                  </div>
                );
              })}
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2 text-amber-600">Low Leave Balance Alerts</p>
              <div className="space-y-2">
                {users.filter(u => u.role === 'worker').map(emp => {
                  const empBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === emp.id);
                  const lowBalances = empBalances.filter((b: LeaveBalance) => (b.total - b.taken - b.pending) <= 2 && b.total > 0);
                  if (lowBalances.length === 0) return null;
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                      <span className="font-medium text-sm">{emp.firstName} {emp.surname}</span>
                      <div className="flex gap-2">
                        {lowBalances.map((b: LeaveBalance) => (
                          <Badge key={b.id} variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
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
                  <p className="text-sm text-muted-foreground">No personnel with low leave balances.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">First Name</Label>
              <Input 
                id="firstName" 
                value={currentUser.firstName || ''} 
                onChange={(e) => setCurrentUser({...currentUser, firstName: e.target.value})}
                className="col-span-3"
                data-testid="input-first-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="surname" className="text-right">Surname</Label>
              <Input 
                id="surname" 
                value={currentUser.surname || ''} 
                onChange={(e) => setCurrentUser({...currentUser, surname: e.target.value})}
                className="col-span-3"
                data-testid="input-surname"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nickname" className="text-right">Nickname</Label>
              <Input 
                id="nickname" 
                value={currentUser.nickname || ''} 
                onChange={(e) => setCurrentUser({...currentUser, nickname: e.target.value})}
                className="col-span-3"
                placeholder="Optional"
                data-testid="input-nickname"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userId" className="text-right">Employee ID</Label>
              <Input 
                id="userId" 
                value={currentUser.id || ''} 
                onChange={(e) => setCurrentUser({...currentUser, id: e.target.value})}
                className="col-span-3"
                disabled={isEditing}
                placeholder="e.g. EMP001"
                data-testid="input-user-id"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={currentUser.email || ''} 
                onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                className="col-span-3"
                placeholder="Optional"
                data-testid="input-email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Password</Label>
              <Input 
                id="password" 
                type="password"
                value={currentUser.password || ''} 
                onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})}
                className="col-span-3"
                placeholder={isEditing ? "Leave blank to keep current password" : (currentUser.userGroupId ? "Required for admin login" : "Optional")}
                data-testid="input-password"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobile" className="text-right">Mobile</Label>
              <Input 
                id="mobile" 
                value={currentUser.mobile || ''} 
                onChange={(e) => setCurrentUser({...currentUser, mobile: e.target.value})}
                className="col-span-3"
                placeholder="Optional"
                data-testid="input-mobile"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="homeAddress" className="text-right">Home Address</Label>
              <Input 
                id="homeAddress" 
                value={currentUser.homeAddress || ''} 
                onChange={(e) => setCurrentUser({...currentUser, homeAddress: e.target.value})}
                className="col-span-3"
                placeholder="Optional"
                data-testid="input-home-address"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gender" className="text-right">Gender</Label>
              <div className="col-span-3">
                <Select 
                  value={currentUser.gender || ''} 
                  onValueChange={(value) => setCurrentUser({...currentUser, gender: value})}
                >
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder="Select gender (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dept" className="text-right">Department</Label>
              <div className="col-span-3">
                <Select 
                  value={currentUser.department || ''} 
                  onValueChange={(value) => {
                    const updates: any = { department: value };
                    if (currentUser.orgPositionId) {
                      const currentPos = orgPositions.find(p => p.id === currentUser.orgPositionId);
                      if (currentPos && currentPos.department !== value) {
                        updates.orgPositionId = undefined;
                      }
                    }
                    setCurrentUser({...currentUser, ...updates});
                  }}
                >
                  <SelectTrigger data-testid="select-department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name} data-testid={`option-dept-${dept.id}`}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departments.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No departments found. Please add them in the Departments section.</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="orgPosition" className="text-right">Position</Label>
              <div className="col-span-3">
                <Select 
                  value={currentUser.orgPositionId?.toString() || ''} 
                  onValueChange={(value) => setCurrentUser({...currentUser, orgPositionId: value ? parseInt(value) : undefined})}
                  disabled={!currentUser.department}
                >
                  <SelectTrigger data-testid="select-position">
                    <SelectValue placeholder={currentUser.department ? "Select a position" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orgPositions
                      .filter(p => p.department === currentUser.department)
                      .map((pos) => (
                        <SelectItem key={pos.id} value={pos.id.toString()}>
                          {pos.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <div className="col-span-3">
                <Select 
                  value={currentUser.role || 'worker'} 
                  onValueChange={(value) => setCurrentUser({...currentUser, role: value})}
                >
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Managers can be assigned as supervisors to other employees.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="manager" className="text-right">Reports To</Label>
              <div className="col-span-3">
                <Select 
                  value={currentUser.managerId || 'none'} 
                  onValueChange={(value) => setCurrentUser({...currentUser, managerId: value === 'none' ? undefined : value})}
                >
                  <SelectTrigger data-testid="select-manager">
                    <SelectValue placeholder="Select a manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {users
                      .filter(u => u.id !== currentUser.id && u.role === 'manager')
                      .map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.id} data-testid={`option-manager-${mgr.id}`}>
                          {mgr.firstName} {mgr.surname} {mgr.department ? `(${mgr.department})` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the direct manager for this employee. Only users with "Manager" role are shown.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="secondManager" className="text-right">2nd Manager</Label>
              <div className="col-span-3">
                <Select 
                  value={currentUser.secondManagerId || 'none'} 
                  onValueChange={(value) => setCurrentUser({...currentUser, secondManagerId: value === 'none' ? undefined : value})}
                >
                  <SelectTrigger data-testid="select-second-manager">
                    <SelectValue placeholder="Select a second manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Second Manager</SelectItem>
                    {users
                      .filter(u => u.id !== currentUser.id && u.role === 'manager' && u.id !== currentUser.managerId)
                      .map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.id} data-testid={`option-second-manager-${mgr.id}`}>
                          {mgr.firstName} {mgr.surname} {mgr.department ? `(${mgr.department})` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional second manager for shared reporting (e.g. employee reports to two department managers).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employeeType" className="text-right">Employment Type</Label>
              <div className="col-span-3">
                <Select 
                  value={currentUser.employeeTypeId?.toString() || ''} 
                  onValueChange={(value) => {
                    const typeId = parseInt(value);
                    const type = employeeTypes.find(t => t.id === typeId);
                    setCurrentUser({
                      ...currentUser, 
                      employeeTypeId: typeId,
                      contractEndDate: type?.isPermanent === 'yes' ? null : currentUser.contractEndDate
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-employee-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Label htmlFor="startDate" className="text-right">Start Date</Label>
              <Input 
                id="startDate" 
                type="date"
                value={currentUser.startDate || ''} 
                onChange={(e) => setCurrentUser({...currentUser, startDate: e.target.value})}
                className="col-span-3"
                data-testid="input-start-date"
              />
            </div>
            {currentUser.employeeTypeId && employeeTypes.find(t => t.id === currentUser.employeeTypeId)?.isPermanent === 'no' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contractEndDate" className="text-right">Contract End Date</Label>
                <Input 
                  id="contractEndDate" 
                  type="date"
                  value={currentUser.contractEndDate || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, contractEndDate: e.target.value})}
                  className="col-span-3 border-amber-300 bg-amber-50"
                  data-testid="input-contract-end-date"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nationalId" className="text-right">National ID</Label>
              <Input 
                id="nationalId" 
                value={currentUser.nationalId || ''} 
                onChange={(e) => setCurrentUser({...currentUser, nationalId: e.target.value})}
                className="col-span-3"
                placeholder="Optional"
                data-testid="input-national-id"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taxNumber" className="text-right">Tax Number</Label>
              <Input 
                id="taxNumber" 
                value={currentUser.taxNumber || ''} 
                onChange={(e) => setCurrentUser({...currentUser, taxNumber: e.target.value})}
                className="col-span-3"
                placeholder="Optional"
                data-testid="input-tax-number"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nextOfKin" className="text-right">Next of Kin</Label>
              <Input 
                id="nextOfKin" 
                value={currentUser.nextOfKin || ''} 
                onChange={(e) => setCurrentUser({...currentUser, nextOfKin: e.target.value})}
                className="col-span-3"
                placeholder="Name and relationship"
                data-testid="input-next-of-kin"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emergencyNumber" className="text-right">Emergency Contact</Label>
              <Input 
                id="emergencyNumber" 
                value={currentUser.emergencyNumber || ''} 
                onChange={(e) => setCurrentUser({...currentUser, emergencyNumber: e.target.value})}
                className="col-span-3"
                placeholder="Emergency phone number"
                data-testid="input-emergency-number"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userGroup" className="text-right">Admin Access</Label>
              <div className="col-span-3">
                <Select 
                  value={currentUser.userGroupId?.toString() || 'none'} 
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setCurrentUser({...currentUser, userGroupId: undefined, role: 'worker', adminRole: null});
                    } else {
                      setCurrentUser({...currentUser, userGroupId: parseInt(value), role: 'manager', adminRole: 'manager'});
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-user-group">
                    <SelectValue placeholder="No admin access" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No admin access (Employee only)</SelectItem>
                    {userGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentUser.userGroupId ? 
                    "This user has admin access and can log into the admin dashboard." : 
                    "Select a group to grant admin access to this user."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="exclude" className="text-right">Exclude</Label>
              <div className="col-span-3 flex items-center gap-3">
                <Switch
                  id="exclude"
                  checked={currentUser.exclude || false}
                  onCheckedChange={(checked) => setCurrentUser({...currentUser, exclude: checked})}
                  data-testid="switch-exclude"
                />
                <p className="text-xs text-muted-foreground">
                  Exclude from org chart and attendance (for test/dummy users).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="attendanceRequired" className="text-right">Attendance Required</Label>
              <div className="col-span-3 flex items-center gap-3">
                <Switch
                  id="attendanceRequired"
                  checked={currentUser.attendanceRequired !== false}
                  onCheckedChange={(checked) => setCurrentUser({...currentUser, attendanceRequired: checked})}
                  data-testid="switch-attendance-required"
                />
                <p className="text-xs text-muted-foreground">
                  Whether this employee needs to clock in/out. Disable for contractors, consultants, or off-site employees.
                </p>
              </div>
            </div>
            {isEditing && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="terminationDate" className="text-right">Termination Date</Label>
                <div className="col-span-3">
                  <Input 
                    id="terminationDate" 
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formatDateForDisplay(currentUser.terminationDate)} 
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidDateFormat(value) || value.length <= 10) {
                        setCurrentUser({...currentUser, terminationDate: parseDateFromDisplay(value)});
                      }
                    }}
                    data-testid="input-termination-date"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: dd/mm/yyyy - Leave blank for active personnel.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
              <Label className="text-right">Profile Photo</Label>
              <div className="col-span-3">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                    {currentUser.photoUrl ? (
                      <div className="relative group w-full h-full">
                        <img src={currentUser.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-white hover:text-white"
                            onClick={() => setCurrentUser({...currentUser, photoUrl: undefined, faceDescriptor: undefined})}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Camera className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  
                  {isCapturingPhoto ? (
                    <div className="flex-1">
                      <WebcamCapture onCapture={handlePhotoCapture} label="Capture Photo" />
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setIsCapturingPhoto(false)}>Cancel</Button>
                    </div>
                  ) : isMultiAngleCapture ? (
                    <div className="flex-1">
                      <MultiAngleFaceCapture 
                        onComplete={handleMultiAngleCaptureComplete}
                        onCancel={() => setIsMultiAngleCapture(false)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full flex items-center justify-start gap-2 h-auto py-2"
                        onClick={() => setIsMultiAngleCapture(true)}
                        disabled={extractingFace}
                      >
                        <Shield className="h-4 w-4 text-blue-600" />
                        <div className="text-left">
                          <div className="font-medium">Secure Face Registration</div>
                          <div className="text-xs text-muted-foreground">Captures multiple angles for better recognition</div>
                        </div>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full text-sm text-muted-foreground"
                        onClick={() => setIsCapturingPhoto(true)}
                      >
                        Quick single photo capture
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveUser}>{isEditing ? 'Save Changes' : 'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Dialog */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Create Admin User
            </DialogTitle>
            <DialogDescription>
              Create a user with administrative access to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminFirstName" className="text-right">First Name</Label>
              <Input 
                id="adminFirstName"
                value={adminData.firstName}
                onChange={(e) => setAdminData({...adminData, firstName: e.target.value})}
                className="col-span-3"
                data-testid="input-admin-first-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminSurname" className="text-right">Surname</Label>
              <Input 
                id="adminSurname"
                value={adminData.surname}
                onChange={(e) => setAdminData({...adminData, surname: e.target.value})}
                className="col-span-3"
                data-testid="input-admin-surname"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminEmail" className="text-right">Email</Label>
              <Input 
                id="adminEmail"
                type="email"
                value={adminData.email}
                onChange={(e) => setAdminData({...adminData, email: e.target.value})}
                className="col-span-3"
                data-testid="input-admin-email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminPassword" className="text-right">Password</Label>
              <div className="col-span-3 flex gap-2">
                <Input 
                  id="adminPassword"
                  value={adminData.password}
                  onChange={(e) => setAdminData({...adminData, password: e.target.value})}
                  className="flex-1 font-mono"
                  data-testid="input-admin-password"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAdminData({...adminData, password: generatePassword()})}
                >
                  Generate
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminGroup" className="text-right">User Group</Label>
              <div className="col-span-3">
                <Select 
                  value={adminData.userGroupId?.toString() || ''} 
                  onValueChange={(value) => setAdminData({...adminData, userGroupId: value ? parseInt(value) : undefined})}
                >
                  <SelectTrigger data-testid="select-admin-group">
                    <SelectValue placeholder="Select a group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {userGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <Mail className="inline h-4 w-4 mr-2" />
              Login credentials will be emailed to the admin after creation.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAdmin} data-testid="button-save-admin">
              Create Admin User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Leave Balances - {selectedEmployeeForBalance?.firstName} {selectedEmployeeForBalance?.surname}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployeeForBalance && (() => {
            const employeeBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === selectedEmployeeForBalance.id);
            return (
              <div className="space-y-4">
                {employeeBalances.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No leave balances set for this employee.</p>
                ) : (
                  <div className="space-y-3">
                    {employeeBalances.map((balance: LeaveBalance) => {
                      const available = balance.total - balance.taken - balance.pending;
                      return (
                        <div key={balance.id} className="p-4 bg-slate-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{balance.leaveType.replace('_', ' ')}</span>
                            <Badge variant={available > 0 ? 'default' : 'destructive'}>
                              {available} available
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-muted-foreground text-xs">Total</p>
                              <p className="font-semibold">{balance.total}</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-muted-foreground text-xs">Taken</p>
                              <p className="font-semibold text-amber-600">{balance.taken}</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-muted-foreground text-xs">Pending</p>
                              <p className="font-semibold text-blue-600">{balance.pending}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Contract Dialog */}
      <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Manage Contract - {contractActionUser?.firstName} {contractActionUser?.surname}
            </DialogTitle>
            <DialogDescription>
              Extend the current contract or convert to a different employment type.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Current Type</Label>
              <p className="col-span-3 font-medium">
                {employeeTypes.find(t => t.id === contractActionUser?.employeeTypeId)?.name || 'Not set'}
              </p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Current End Date</Label>
              <p className="col-span-3 font-medium">
                {contractActionUser?.contractEndDate ? formatDateForDisplay(contractActionUser.contractEndDate) : 'Permanent'}
              </p>
            </div>
            
            <div className="border-t pt-4">
              <Label className="mb-2 block">Action to take</Label>
              <div className="flex gap-4">
                <Button 
                  variant={contractAction === 'extend' ? 'default' : 'outline'}
                  onClick={() => setContractAction('extend')}
                  className="flex-1"
                >
                  Extend Contract
                </Button>
                <Button 
                  variant={contractAction === 'convert' ? 'default' : 'outline'}
                  onClick={() => setContractAction('convert')}
                  className="flex-1"
                >
                  Convert Type
                </Button>
              </div>
            </div>

            {contractAction === 'extend' ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newEndDate" className="text-right">New End Date</Label>
                <Input 
                  id="newEndDate" 
                  type="date"
                  value={contractNewEndDate} 
                  onChange={(e) => setContractNewEndDate(e.target.value)}
                  className="col-span-3"
                  data-testid="input-contract-new-end-date"
                />
              </div>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newType" className="text-right">New Type</Label>
                <div className="col-span-3">
                  <Select 
                    value={contractNewTypeId?.toString() || ''} 
                    onValueChange={(v) => {
                      const typeId = parseInt(v);
                      setContractNewTypeId(typeId);
                      const type = employeeTypes.find(t => t.id === typeId);
                      if (type?.isPermanent === 'yes') setContractNewEndDate('');
                    }}
                  >
                    <SelectTrigger data-testid="select-contract-new-type">
                      <SelectValue placeholder="Select new type" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {contractAction === 'convert' && contractNewTypeId && employeeTypes.find(t => t.id === contractNewTypeId)?.isPermanent === 'no' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="convertEndDate" className="text-right">New End Date</Label>
                <Input 
                  id="convertEndDate" 
                  type="date"
                  value={contractNewEndDate} 
                  onChange={(e) => setContractNewEndDate(e.target.value)}
                  className="col-span-3"
                  data-testid="input-contract-convert-end-date"
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">Reason/Notes</Label>
              <Input 
                id="reason" 
                value={contractReason} 
                onChange={(e) => setContractReason(e.target.value)}
                className="col-span-3"
                placeholder="Optional reason for change"
                data-testid="input-contract-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContractDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleContractAction}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Termination Dialog */}
      <Dialog open={isTerminationDialogOpen} onOpenChange={setIsTerminationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <UserX className="h-5 w-5" />
              Terminate Personnel
            </DialogTitle>
            <DialogDescription>
              This will mark {terminationUser?.firstName} {terminationUser?.surname} as terminated.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Employee</Label>
              <p className="col-span-3 font-medium text-sm">
                {terminationUser?.firstName} {terminationUser?.surname}
              </p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">ID</Label>
              <p className="col-span-3 font-medium text-sm">
                {terminationUser?.id}
              </p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="terminationDateInput" className="text-right text-xs">Termination Date</Label>
              <Input 
                id="terminationDateInput" 
                type="date"
                value={terminationDate} 
                onChange={(e) => setTerminationDate(e.target.value)}
                className="col-span-3"
                data-testid="input-termination-date-dialog"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The employee will be marked as terminated on this date. They will no longer be able to clock in or submit leave requests.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTerminationDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (terminationUser && terminationDate) {
                  updateUserMutation.mutate({
                    id: terminationUser.id,
                    terminationDate: terminationDate
                  });
                  setIsTerminationDialogOpen(false);
                  toast({
                    title: "Personnel Terminated",
                    description: `${terminationUser.firstName} ${terminationUser.surname} has been marked as terminated.`,
                  });
                } else if (!terminationDate) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Please select a termination date.",
                  });
                }
              }}
              data-testid="button-confirm-termination"
            >
              Confirm Termination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
