import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { userApi, settingsApi, departmentApi, userGroupApi, leaveRequestApi, leaveBalanceApi, attendanceApi, employeeTypeApi, leaveRuleApi, leaveRulePhaseApi, contractHistoryApi } from '@/lib/api';
import type { User, Department, UserGroup, LeaveRequest, LeaveBalance, AttendanceRecord, EmployeeType, LeaveRule, LeaveRulePhase, ContractHistory } from '@shared/schema';
import { Plus, Pencil, Trash2, Save, Mail, Users, Settings, Camera, Building2, Loader2, CheckCircle2, UserCog, Shield, Calendar, Clock, FileText, Check, X, Search, ChevronDown, ChevronRight, LayoutDashboard, AlertTriangle, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/lib/auth-context';
import WebcamCapture from '@/components/WebcamCapture';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { loadFaceModels, extractFaceDescriptorFromBase64, descriptorToJson } from '@/lib/face-recognition';

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, setUser, logout } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const { data: emailSetting } = useQuery({
    queryKey: ['settings', 'admin_email'],
    queryFn: () => settingsApi.get('admin_email'),
  });

  const { data: clockInCutoffSetting } = useQuery({
    queryKey: ['settings', 'clock_in_cutoff'],
    queryFn: () => settingsApi.get('clock_in_cutoff'),
  });

  const { data: clockOutCutoffSetting } = useQuery({
    queryKey: ['settings', 'clock_out_cutoff'],
    queryFn: () => settingsApi.get('clock_out_cutoff'),
  });

  const { data: lateArrivalMessageSetting } = useQuery({
    queryKey: ['settings', 'late_arrival_message'],
    queryFn: () => settingsApi.get('late_arrival_message'),
  });

  const { data: earlyDepartureMessageSetting } = useQuery({
    queryKey: ['settings', 'early_departure_message'],
    queryFn: () => settingsApi.get('early_departure_message'),
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

  const { data: leaveRules = [] } = useQuery({
    queryKey: ['leaveRules'],
    queryFn: leaveRuleApi.getAll,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => leaveRequestApi.getAll(),
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: () => leaveBalanceApi.getAll(),
  });

  const [attendanceStartDate, setAttendanceStartDate] = useState('');
  const [attendanceEndDate, setAttendanceEndDate] = useState('');

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance', attendanceStartDate, attendanceEndDate],
    queryFn: () => attendanceApi.getAll(attendanceStartDate || undefined, attendanceEndDate || undefined),
  });
  
  // User Management State
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [extractingFace, setExtractingFace] = useState(false);
  const [faceExtracted, setFaceExtracted] = useState(false);

  // Department Management State
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [currentDept, setCurrentDept] = useState<Partial<Department>>({});
  const [isEditingDept, setIsEditingDept] = useState(false);

  // User Group Management State
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Partial<UserGroup>>({});
  const [isEditingGroup, setIsEditingGroup] = useState(false);

  // Admin User Creation State
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminData, setAdminData] = useState<{
    firstName: string;
    surname: string;
    email: string;
    password: string;
    userGroupId?: number;
  }>({ firstName: '', surname: '', email: '', password: '' });

  // First-time photo setup for admins
  const [showPhotoSetup, setShowPhotoSetup] = useState(false);
  const [adminPhotoCapturing, setAdminPhotoCapturing] = useState(false);
  const [adminExtractingFace, setAdminExtractingFace] = useState(false);
  const [adminPhotoUrl, setAdminPhotoUrl] = useState<string | null>(null);
  const [adminFaceDescriptor, setAdminFaceDescriptor] = useState<string | null>(null);

  // Leave Request Review State
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);

  // Employee Balance View State
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [selectedEmployeeForBalance, setSelectedEmployeeForBalance] = useState<User | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [expandedLeaveBalanceEmployees, setExpandedLeaveBalanceEmployees] = useState<Set<string>>(new Set());

  // Navigation State
  const [activeSection, setActiveSection] = useState<'dashboard' | 'employees' | 'leave-requests' | 'attendance' | 'departments' | 'groups' | 'employee-types' | 'leave-rules' | 'settings'>('dashboard');

  // Employee Types Management State
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [currentType, setCurrentType] = useState<Partial<EmployeeType>>({});
  const [isEditingType, setIsEditingType] = useState(false);

  // Leave Rules Management State
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Partial<LeaveRule>>({});
  const [isEditingRule, setIsEditingRule] = useState(false);
  
  // Leave Rule Phases State
  const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false);
  const [currentPhaseRule, setCurrentPhaseRule] = useState<LeaveRule | null>(null);
  const [phases, setPhases] = useState<LeaveRulePhase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);

  // Contract Management State
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [contractActionUser, setContractActionUser] = useState<User | null>(null);
  const [contractAction, setContractAction] = useState<'extend' | 'convert'>('extend');
  const [contractNewEndDate, setContractNewEndDate] = useState('');
  const [contractNewTypeId, setContractNewTypeId] = useState<number | null>(null);
  const [contractReason, setContractReason] = useState('');

  // Settings State
  const [emailSettings, setEmailSettings] = useState('');
  const [clockInCutoff, setClockInCutoff] = useState('08:00');
  const [clockOutCutoff, setClockOutCutoff] = useState('17:00');
  const [lateArrivalMessage, setLateArrivalMessage] = useState('{name} (ID: {id}) clocked in late at {time}. Expected by {cutoff}.');
  const [earlyDepartureMessage, setEarlyDepartureMessage] = useState('{name} (ID: {id}) left early at {time}. Expected after {cutoff}.');

  useEffect(() => {
    if (emailSetting) {
      setEmailSettings(emailSetting.value);
    }
  }, [emailSetting]);

  useEffect(() => {
    if (clockInCutoffSetting) {
      setClockInCutoff(clockInCutoffSetting.value);
    }
  }, [clockInCutoffSetting]);

  useEffect(() => {
    if (clockOutCutoffSetting) {
      setClockOutCutoff(clockOutCutoffSetting.value);
    }
  }, [clockOutCutoffSetting]);

  useEffect(() => {
    if (lateArrivalMessageSetting) {
      setLateArrivalMessage(lateArrivalMessageSetting.value);
    }
  }, [lateArrivalMessageSetting]);

  useEffect(() => {
    if (earlyDepartureMessageSetting) {
      setEarlyDepartureMessage(earlyDepartureMessageSetting.value);
    }
  }, [earlyDepartureMessageSetting]);

  // Check if admin needs to set up their photo
  useEffect(() => {
    if (user && user.role === 'manager' && !user.faceDescriptor) {
      setShowPhotoSetup(true);
    }
  }, [user]);

  const handleAdminPhotoCapture = async (photoData: string) => {
    setAdminPhotoUrl(photoData);
    setAdminExtractingFace(true);
    
    try {
      await loadFaceModels();
      const descriptor = await extractFaceDescriptorFromBase64(photoData);
      
      if (descriptor) {
        const descriptorJson = descriptorToJson(descriptor);
        setAdminFaceDescriptor(descriptorJson);
        toast({ title: "Face Detected", description: "Your face has been captured successfully." });
      } else {
        toast({ variant: "destructive", title: "No Face Detected", description: "Please try again with better lighting." });
        setAdminPhotoUrl(null);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to process face. Please try again." });
      setAdminPhotoUrl(null);
    } finally {
      setAdminExtractingFace(false);
      setAdminPhotoCapturing(false);
    }
  };

  const handleSaveAdminPhoto = async () => {
    if (!user || !adminPhotoUrl) return;
    
    try {
      const updatedUser = await userApi.update(user.id, {
        photoUrl: adminPhotoUrl,
        faceDescriptor: adminFaceDescriptor,
      });
      
      setUser(updatedUser);
      setShowPhotoSetup(false);
      setAdminPhotoUrl(null);
      setAdminFaceDescriptor(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Photo Saved", description: "Your profile photo has been updated." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save photo." });
    }
  };

  const createUserMutation = useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
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
    onSuccess: () => {
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

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => settingsApi.set(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: "Settings Saved", description: "Email configuration updated." });
    },
  });

  const updateLeaveStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => leaveRequestApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: "Leave Request Updated", description: "Status has been updated and notification sent." });
    },
  });

  const createLeaveBalanceMutation = useMutation({
    mutationFn: (balance: { userId: string; leaveType: string; total: number }) => leaveBalanceApi.create(balance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: "Leave Balance Created", description: "New leave allocation has been added." });
    },
  });

  const updateLeaveBalanceMutation = useMutation({
    mutationFn: ({ id, total }: { id: number; total: number }) => leaveBalanceApi.update(id, { total }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: "Leave Balance Updated", description: "Leave allocation has been updated." });
    },
  });

  const toggleEmployeeExpanded = (userId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleLeaveBalanceEmployeeExpanded = (userId: string) => {
    setExpandedLeaveBalanceEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Helper function to calculate employment duration
  const getEmploymentDuration = (startDateStr: string | null | undefined): string => {
    if (!startDateStr) return '-';
    
    const startDate = new Date(startDateStr);
    const today = new Date();
    
    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years > 0 && months > 0) {
      return `${years}y ${months}m`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  };

  const createDeptMutation = useMutation({
    mutationFn: departmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: "Department Created", description: "Department has been added successfully." });
      setIsDeptDialogOpen(false);
      setCurrentDept({});
      setIsEditingDept(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => departmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: "Department Updated", description: "Department has been updated successfully." });
      setIsDeptDialogOpen(false);
      setCurrentDept({});
      setIsEditingDept(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: departmentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: "Department Deleted", description: "Department has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: userGroupApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      toast({ title: "User Group Created", description: "User group has been added successfully." });
      setIsGroupDialogOpen(false);
      setCurrentGroup({});
      setIsEditingGroup(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => userGroupApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      toast({ title: "User Group Updated", description: "User group has been updated successfully." });
      setIsGroupDialogOpen(false);
      setCurrentGroup({});
      setIsEditingGroup(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: userGroupApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      toast({ title: "User Group Deleted", description: "User group has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Employee Type Mutations
  const createTypeMutation = useMutation({
    mutationFn: employeeTypeApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeTypes'] });
      toast({ title: "Employee Type Created", description: "Employee type has been added successfully." });
      setIsTypeDialogOpen(false);
      setCurrentType({});
      setIsEditingType(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => employeeTypeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeTypes'] });
      toast({ title: "Employee Type Updated", description: "Employee type has been updated successfully." });
      setIsTypeDialogOpen(false);
      setCurrentType({});
      setIsEditingType(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: employeeTypeApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeTypes'] });
      toast({ title: "Employee Type Deleted", description: "Employee type has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Leave Rule Mutations
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

  const handleSaveUser = () => {
    if (!currentUser.firstName || !currentUser.surname || !currentUser.id) {
      toast({ variant: "destructive", title: "Error", description: "First name, surname, and ID are required" });
      return;
    }
    
    // Determine role based on userGroupId
    const role = currentUser.userGroupId ? 'manager' : 'worker';
    
    // Workers require a department
    if (role === 'worker' && !currentUser.department) {
      toast({ variant: "destructive", title: "Error", description: "Department is required for workers" });
      return;
    }
    
    // Admins require email
    if (currentUser.userGroupId && !currentUser.email) {
      toast({ variant: "destructive", title: "Error", description: "Email is required for admin users" });
      return;
    }
    
    // New admins or promoted workers without existing password need a password
    // We check if they're being newly created OR if they don't have an existing password
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
        toast({ title: "Face Detected", description: "Facial recognition data has been extracted from the photo." });
      } else {
        toast({ variant: "destructive", title: "No Face Detected", description: "Please take a clear photo with your face visible." });
      }
    } catch (err) {
      console.error('Face extraction error:', err);
      toast({ variant: "destructive", title: "Error", description: "Failed to process face recognition." });
    } finally {
      setExtractingFace(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    deleteUserMutation.mutate(id);
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
    setCurrentUser({});
    setIsEditing(false);
    setIsUserDialogOpen(true);
    setFaceExtracted(false);
    setExtractingFace(false);
    setIsCapturingPhoto(false);
  };

  const handleSaveSettings = async () => {
    await updateSettingMutation.mutateAsync({ key: 'admin_email', value: emailSettings });
    await updateSettingMutation.mutateAsync({ key: 'clock_in_cutoff', value: clockInCutoff });
    await updateSettingMutation.mutateAsync({ key: 'clock_out_cutoff', value: clockOutCutoff });
    await updateSettingMutation.mutateAsync({ key: 'late_arrival_message', value: lateArrivalMessage });
    await updateSettingMutation.mutateAsync({ key: 'early_departure_message', value: earlyDepartureMessage });
  };

  const handleSaveDept = () => {
    if (!currentDept.name) {
      toast({ variant: "destructive", title: "Error", description: "Department name is required" });
      return;
    }

    if (isEditingDept && currentDept.id) {
      updateDeptMutation.mutate({ id: currentDept.id, name: currentDept.name, description: currentDept.description });
    } else {
      createDeptMutation.mutate({ name: currentDept.name, description: currentDept.description || undefined });
    }
  };

  const handleOpenEditDept = (dept: Department) => {
    setCurrentDept(dept);
    setIsEditingDept(true);
    setIsDeptDialogOpen(true);
  };

  const handleOpenCreateDept = () => {
    setCurrentDept({});
    setIsEditingDept(false);
    setIsDeptDialogOpen(true);
  };

  const handleDeleteDept = (id: number) => {
    deleteDeptMutation.mutate(id);
  };

  // User Group Handlers
  const handleSaveGroup = () => {
    if (!currentGroup.name) {
      toast({ variant: "destructive", title: "Error", description: "Group name is required" });
      return;
    }

    if (isEditingGroup && currentGroup.id) {
      updateGroupMutation.mutate({ id: currentGroup.id, name: currentGroup.name, description: currentGroup.description });
    } else {
      createGroupMutation.mutate({ name: currentGroup.name, description: currentGroup.description || undefined });
    }
  };

  const handleOpenEditGroup = (group: UserGroup) => {
    setCurrentGroup(group);
    setIsEditingGroup(true);
    setIsGroupDialogOpen(true);
  };

  const handleOpenCreateGroup = () => {
    setCurrentGroup({});
    setIsEditingGroup(false);
    setIsGroupDialogOpen(true);
  };

  const handleDeleteGroup = (id: number) => {
    deleteGroupMutation.mutate(id);
  };

  // Employee Type Handlers
  const handleSaveType = () => {
    if (!currentType.name) {
      toast({ variant: "destructive", title: "Error", description: "Type name is required" });
      return;
    }

    if (isEditingType && currentType.id) {
      updateTypeMutation.mutate({
        id: currentType.id,
        name: currentType.name,
        description: currentType.description || null,
        leaveLabel: currentType.leaveLabel || 'leave',
        hasLeaveEntitlement: currentType.hasLeaveEntitlement || 'true',
      });
    } else {
      createTypeMutation.mutate({
        name: currentType.name,
        description: currentType.description || undefined,
        leaveLabel: currentType.leaveLabel || 'leave',
        hasLeaveEntitlement: currentType.hasLeaveEntitlement || 'true',
      });
    }
  };

  const handleOpenEditType = (type: EmployeeType) => {
    setCurrentType(type);
    setIsEditingType(true);
    setIsTypeDialogOpen(true);
  };

  const handleOpenCreateType = () => {
    setCurrentType({ leaveLabel: 'leave', hasLeaveEntitlement: 'true', isPermanent: 'yes' });
    setIsEditingType(false);
    setIsTypeDialogOpen(true);
  };

  const handleDeleteType = (id: number) => {
    deleteTypeMutation.mutate(id);
  };

  // Leave Rule Handlers
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
    deleteRuleMutation.mutate(id);
  };

  // Phase Editor Handlers
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

  // Contract Management Handlers
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
        
        // Update user's contract end date
        await userApi.update(contractActionUser.id, { contractEndDate: contractNewEndDate });
        
        // Log the extension in contract history
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
        // Convert to different type
        if (!contractNewTypeId) {
          toast({ variant: "destructive", title: "Error", description: "Please select a new employee type" });
          return;
        }
        
        const isNewTypePermanent = newType?.isPermanent === 'yes';
        const updateData: Partial<User> = { 
          employeeTypeId: contractNewTypeId,
          contractEndDate: isNewTypePermanent ? null : (contractNewEndDate || null),
        };
        
        // Update user
        await userApi.update(contractActionUser.id, updateData);
        
        // Log the conversion in contract history
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
      
      // Refresh data - await to ensure cache updates before dialog closes
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsContractDialogOpen(false);
      setContractActionUser(null);
    } catch (error) {
      console.error('Contract action error:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update contract" });
    }
  };

  // Admin User Handlers
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
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
      userGroupId: adminData.userGroupId,
    }, {
      onSuccess: () => {
        setIsAdminDialogOpen(false);
        setAdminData({ firstName: '', surname: '', email: '', password: '' });
        toast({ title: "Admin Created", description: `Admin user created. Login credentials have been sent to ${adminData.email}` });
      }
    });
  };

  return (
    <Layout>
      {/* First-time Photo Setup Dialog */}
      <AlertDialog open={showPhotoSetup}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Set Up Your Profile Photo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Welcome! To enable facial recognition for quick login, please capture your photo now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 mt-4">
            {adminPhotoCapturing ? (
              <div className="space-y-4">
                <WebcamCapture onCapture={handleAdminPhotoCapture} />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setAdminPhotoCapturing(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : adminPhotoUrl ? (
              <div className="space-y-4">
                <div className="relative">
                  <img 
                    src={adminPhotoUrl} 
                    alt="Captured photo" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {adminExtractingFace && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="text-white flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Detecting face...
                      </div>
                    </div>
                  )}
                  {adminFaceDescriptor && (
                    <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Face detected
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setAdminPhotoUrl(null);
                      setAdminFaceDescriptor(null);
                      setAdminPhotoCapturing(true);
                    }}
                  >
                    Retake
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleSaveAdminPhoto}
                    disabled={!adminFaceDescriptor}
                  >
                    Save Photo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-100 rounded-lg p-8 text-center">
                  <Camera className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">No photo captured yet</p>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => setAdminPhotoCapturing(true)}
                  data-testid="button-capture-admin-photo"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Photo
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-slate-500"
                  onClick={() => setShowPhotoSetup(false)}
                >
                  Skip for now
                </Button>
              </div>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex gap-6">
        {/* Left Navigation Sidebar */}
        <div className="w-64 shrink-0">
          <div className="sticky top-4 space-y-1">
            <h2 className="text-lg font-heading font-bold text-gray-900 mb-4">AECE Checkpoint</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveSection('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'dashboard' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-dashboard"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </button>
              <button
                onClick={() => setActiveSection('employees')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'employees' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-employees"
              >
                <Users className="h-4 w-4" /> Personnel
              </button>
              <button
                onClick={() => setActiveSection('leave-requests')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'leave-requests' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-leave-requests"
              >
                <FileText className="h-4 w-4" /> Leave Requests
              </button>
              <button
                onClick={() => setActiveSection('attendance')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'attendance' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-attendance"
              >
                <Clock className="h-4 w-4" /> Attendance
              </button>
              <button
                onClick={() => setActiveSection('departments')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'departments' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-departments"
              >
                <Building2 className="h-4 w-4" /> Departments
              </button>
              <button
                onClick={() => setActiveSection('groups')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'groups' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-groups"
              >
                <Shield className="h-4 w-4" /> User Groups
              </button>
              <button
                onClick={() => setActiveSection('employee-types')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'employee-types' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-employee-types"
              >
                <UserCog className="h-4 w-4" /> Employee Types
              </button>
              <button
                onClick={() => setActiveSection('leave-rules')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'leave-rules' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-leave-rules"
              >
                <Calendar className="h-4 w-4" /> Leave Rules
              </button>
              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'settings' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-settings"
              >
                <Settings className="h-4 w-4" /> Settings
              </button>
              
              <div className="pt-4 mt-4 border-t">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-red-50 text-red-600"
                  data-testid="nav-logout"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Dashboard Overview */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your workforce management</p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{users.filter(u => u.role === 'worker').length}</p>
                        <p className="text-sm text-muted-foreground">Total Personnel</p>
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
                        <p className="text-2xl font-bold">{leaveRequests.filter((r: LeaveRequest) => r.status === 'pending').length}</p>
                        <p className="text-sm text-muted-foreground">Pending Leave</p>
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
                          {users.filter(u => u.role === 'worker').filter(emp => {
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

              {/* Pending Leave Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-500" />
                    Pending Leave Requests
                  </CardTitle>
                  <CardDescription>Leave requests awaiting your approval</CardDescription>
                </CardHeader>
                <CardContent>
                  {leaveRequests.filter((r: LeaveRequest) => r.status === 'pending').length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No pending leave requests</p>
                  ) : (
                    <div className="space-y-2">
                      {leaveRequests.filter((r: LeaveRequest) => r.status === 'pending').slice(0, 5).map((request: LeaveRequest) => {
                        const employee = users.find(u => u.id === request.userId);
                        return (
                          <div key={request.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200">
                                <img src={employee?.photoUrl || 'https://github.com/shadcn.png'} alt="" className="h-full w-full object-cover" />
                              </div>
                              <div>
                                <p className="font-medium">{employee ? `${employee.firstName} ${employee.surname}` : request.userId}</p>
                                <p className="text-xs text-muted-foreground">
                                  {request.leaveType} • {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d')}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedLeaveRequest(request);
                                  setIsReviewDialogOpen(true);
                                }}
                              >
                                Review
                              </Button>
                              <Button 
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateLeaveStatusMutation.mutate({ id: request.id, status: 'approved' })}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                variant="destructive"
                                onClick={() => updateLeaveStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {leaveRequests.filter((r: LeaveRequest) => r.status === 'pending').length > 5 && (
                        <Button variant="link" className="w-full" onClick={() => setActiveSection('leave-requests')}>
                          View all {leaveRequests.filter((r: LeaveRequest) => r.status === 'pending').length} pending requests
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
                    {users.filter(u => u.role === 'worker').map(emp => {
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
          )}

          {/* Personnel Section */}
          {activeSection === 'employees' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-gray-900">Personnel</h1>
                <p className="text-muted-foreground">Manage personnel access, IDs, and leave balances</p>
              </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Personnel</CardTitle>
                  <CardDescription>Manage personnel access, IDs, and leave balances</CardDescription>
                </div>
                <Button onClick={handleOpenCreate} className="btn-industrial bg-primary text-white">
                  <Plus className="mr-2 h-4 w-4" /> Add Person
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Tenure</TableHead>
                      <TableHead>Leave Balance</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((emp) => {
                      const empBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === emp.id);
                      const totalAvailable = empBalances.reduce((sum: number, b: LeaveBalance) => sum + (b.total - b.taken - b.pending), 0);
                      const isExpanded = expandedEmployees.has(emp.id);
                      
                      return (
                        <>
                          <TableRow key={emp.id} className="cursor-pointer hover:bg-slate-50" onClick={() => toggleEmployeeExpanded(emp.id)}>
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
                            <TableCell>{emp.department}</TableCell>
                            <TableCell>
                              <span className="text-sm" title={emp.startDate ? `Started: ${format(new Date(emp.startDate), 'MMM d, yyyy')}` : 'Start date not set'}>
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
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(emp)} title="Edit">
                                <Pencil className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(emp.id)} title="Delete">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${emp.id}-expanded`} className="bg-slate-50">
                              <TableCell colSpan={8} className="py-4">
                                <div className="pl-8 space-y-4">
                                  {/* Employment Details */}
                                  <div className="flex gap-8 p-3 bg-white rounded-lg border mb-4">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Start Date</p>
                                      <p className="font-medium">{emp.startDate ? format(new Date(emp.startDate), 'MMM d, yyyy') : 'Not set'}</p>
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
                                    {(() => {
                                      const empType = employeeTypes.find(t => t.id === emp.employeeTypeId);
                                      if (empType && empType.isPermanent === 'no') {
                                        const isExpired = emp.contractEndDate && new Date(emp.contractEndDate) < new Date();
                                        return (
                                          <>
                                            <div>
                                              <p className="text-xs text-muted-foreground">Contract End Date</p>
                                              <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                                                {emp.contractEndDate ? format(new Date(emp.contractEndDate), 'MMM d, yyyy') : 'Not set'}
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
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Aggregated Leave Balances Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Leave Balances Summary</CardTitle>
                <CardDescription>Overview of all employee leave balances</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveBalances.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leave balances found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4">
                      {['Annual Leave', 'Sick Leave', 'Family Leave', 'Study Leave'].map(leaveType => {
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
                    
                    {/* Employees with low leave */}
                    <div>
                      <p className="text-sm font-medium mb-2 text-amber-600">Low Leave Balance Alerts</p>
                      <div className="space-y-2">
                        {users.filter(u => u.role === 'worker').map(emp => {
                          const empBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === emp.id);
                          const lowBalances = empBalances.filter((b: LeaveBalance) => (b.total - b.taken - b.pending) <= 2 && b.total > 0);
                          if (lowBalances.length === 0) return null;
                          return (
                            <div key={emp.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                              <span className="font-medium">{emp.firstName} {emp.surname}</span>
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
                          <p className="text-sm text-muted-foreground">No personnel with low leave balances.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          )}

          {/* Leave Requests Section */}
          {activeSection === 'leave-requests' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">Leave Requests</h1>
                <p className="text-muted-foreground">Review and approve/reject employee leave requests</p>
              </div>
            <Card>
              <CardHeader>
                <CardTitle>Leave Requests</CardTitle>
                <CardDescription>Review and approve/reject employee leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leave requests found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((request: LeaveRequest) => {
                        const employee = users.find(u => u.id === request.userId);
                        return (
                          <TableRow key={request.id} data-testid={`row-leave-request-${request.id}`}>
                            <TableCell className="font-medium">
                              {employee ? `${employee.firstName} ${employee.surname}` : request.userId}
                            </TableCell>
                            <TableCell className="capitalize">{request.leaveType.replace('_', ' ')}</TableCell>
                            <TableCell>
                              {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'rejected' ? 'destructive' : 'secondary'
                              }>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedLeaveRequest(request);
                                  setIsReviewDialogOpen(true);
                                }}
                                data-testid={`button-review-${request.id}`}
                                title="Review"
                              >
                                <FileText className="h-4 w-4 text-blue-500" />
                              </Button>
                              {request.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => updateLeaveStatusMutation.mutate({ id: request.id, status: 'approved' })}
                                    data-testid={`button-approve-${request.id}`}
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => updateLeaveStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                                    data-testid={`button-reject-${request.id}`}
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leave Balances</CardTitle>
                <CardDescription>View and manage employee leave balances - click employee name to expand</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveBalances.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leave balances found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Total Days</TableHead>
                        <TableHead>Taken</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const employeeBalances = new Map<string, LeaveBalance[]>();
                        leaveBalances.forEach((balance: LeaveBalance) => {
                          const existing = employeeBalances.get(balance.userId) || [];
                          existing.push(balance);
                          employeeBalances.set(balance.userId, existing);
                        });
                        
                        return Array.from(employeeBalances.entries()).map(([userId, balances]) => {
                          const employee = users.find(u => u.id === userId);
                          const isExpanded = expandedLeaveBalanceEmployees.has(userId);
                          const totalDays = balances.reduce((sum, b) => sum + b.total, 0);
                          const totalTaken = balances.reduce((sum, b) => sum + b.taken, 0);
                          const totalPending = balances.reduce((sum, b) => sum + b.pending, 0);
                          const totalAvailable = totalDays - totalTaken - totalPending;
                          
                          return (
                            <React.Fragment key={userId}>
                              <TableRow 
                                className="cursor-pointer hover:bg-slate-50"
                                onClick={() => toggleLeaveBalanceEmployeeExpanded(userId)}
                                data-testid={`row-balance-employee-${userId}`}
                              >
                                <TableCell>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {employee ? `${employee.firstName} ${employee.surname}` : userId}
                                </TableCell>
                                <TableCell>{totalDays}</TableCell>
                                <TableCell>{totalTaken}</TableCell>
                                <TableCell>{totalPending}</TableCell>
                                <TableCell>
                                  <Badge variant={totalAvailable > 0 ? 'default' : 'destructive'}>
                                    {totalAvailable}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                              
                              {isExpanded && balances.map((balance) => {
                                const available = balance.total - balance.taken - balance.pending;
                                return (
                                  <TableRow key={balance.id} className="bg-slate-50/50" data-testid={`row-balance-detail-${balance.id}`}>
                                    <TableCell></TableCell>
                                    <TableCell className="pl-8 text-muted-foreground capitalize">
                                      {balance.leaveType.replace('_', ' ')}
                                    </TableCell>
                                    <TableCell>{balance.total}</TableCell>
                                    <TableCell>{balance.taken}</TableCell>
                                    <TableCell>{balance.pending}</TableCell>
                                    <TableCell>
                                      <Badge variant={available > 0 ? 'outline' : 'destructive'} className="text-xs">
                                        {available}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            </div>
          )}

          {/* Attendance Section */}
          {activeSection === 'attendance' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">Attendance</h1>
                <p className="text-muted-foreground">View employee clock-in/clock-out history</p>
              </div>
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between w-full">
                  <div>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription>View employee clock-in/clock-out history</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={attendanceStartDate}
                      onChange={(e) => setAttendanceStartDate(e.target.value)}
                      className="w-40"
                      data-testid="input-start-date"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={attendanceEndDate}
                      onChange={(e) => setAttendanceEndDate(e.target.value)}
                      className="w-40"
                      data-testid="input-end-date"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAttendanceStartDate('');
                        setAttendanceEndDate('');
                      }}
                      data-testid="button-clear-filters"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records found for the selected date range.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Context</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record: AttendanceRecord) => {
                        const employee = users.find(u => u.id === record.userId);
                        return (
                          <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                            <TableCell className="font-medium">
                              {employee ? `${employee.firstName} ${employee.surname}` : record.userId}
                            </TableCell>
                            <TableCell>
                              <Badge variant={record.type === 'in' ? 'default' : 'secondary'}>
                                Clock {record.type === 'in' ? 'In' : 'Out'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(record.timestamp), "MMM d, yyyy 'at' h:mm a")}
                            </TableCell>
                            <TableCell className="capitalize">{record.context || '-'}</TableCell>
                            <TableCell className="capitalize">{record.method || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            </div>
          )}

          {/* Departments Section */}
          {activeSection === 'departments' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">Departments</h1>
                <p className="text-muted-foreground">Manage departments for employee organization</p>
              </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Departments</CardTitle>
                  <CardDescription>Manage departments for employee organization</CardDescription>
                </div>
                <Button onClick={handleOpenCreateDept} className="btn-industrial bg-primary text-white" data-testid="button-add-department">
                  <Plus className="mr-2 h-4 w-4" /> Add Department
                </Button>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No departments created yet. Click "Add Department" to create your first one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Personnel</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept) => {
                        const employeeCount = users.filter(u => u.department === dept.name).length;
                        return (
                          <TableRow key={dept.id} data-testid={`row-department-${dept.id}`}>
                            <TableCell className="font-medium">{dept.name}</TableCell>
                            <TableCell className="text-muted-foreground">{dept.description || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{employeeCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditDept(dept)} data-testid={`button-edit-dept-${dept.id}`}>
                                <Pencil className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteDept(dept.id)}
                                disabled={employeeCount > 0}
                                title={employeeCount > 0 ? "Cannot delete department with personnel" : "Delete department"}
                                data-testid={`button-delete-dept-${dept.id}`}
                              >
                                <Trash2 className={`h-4 w-4 ${employeeCount > 0 ? 'text-slate-300' : 'text-red-500'}`} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            </div>
          )}

          {/* User Groups Section */}
          {activeSection === 'groups' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">User Groups</h1>
                <p className="text-muted-foreground">Manage admin user groups for access control</p>
              </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Groups</CardTitle>
                  <CardDescription>Manage admin user groups for access control</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleOpenCreateAdmin} className="btn-industrial bg-amber-500 hover:bg-amber-600 text-black" data-testid="button-add-admin">
                    <UserCog className="mr-2 h-4 w-4" /> Add Admin User
                  </Button>
                  <Button onClick={handleOpenCreateGroup} className="btn-industrial bg-primary text-white" data-testid="button-add-group">
                    <Plus className="mr-2 h-4 w-4" /> Add Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {userGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No user groups created yet. Click "Add Group" to create your first one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Admins</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userGroups.map((group) => {
                        const adminCount = users.filter(u => u.userGroupId === group.id).length;
                        return (
                          <TableRow key={group.id} data-testid={`row-group-${group.id}`}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell className="text-muted-foreground">{group.description || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{adminCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditGroup(group)} data-testid={`button-edit-group-${group.id}`}>
                                <Pencil className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteGroup(group.id)}
                                disabled={adminCount > 0}
                                title={adminCount > 0 ? "Cannot delete group with assigned admins" : "Delete group"}
                                data-testid={`button-delete-group-${group.id}`}
                              >
                                <Trash2 className={`h-4 w-4 ${adminCount > 0 ? 'text-slate-300' : 'text-red-500'}`} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Administrators with system access</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>User Group</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => u.role === 'manager').map((admin) => {
                      const group = userGroups.find(g => g.id === admin.userGroupId);
                      return (
                        <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                          <TableCell className="font-medium">{admin.firstName} {admin.surname}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            {group ? (
                              <Badge variant="secondary">{group.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleResendCredentials(admin.id)}
                              title="Resend credentials email"
                              data-testid={`button-resend-credentials-${admin.id}`}
                            >
                              <Mail className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(admin.id)}>
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
            </div>
          )}

          {/* Employee Types Section */}
          {activeSection === 'employee-types' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-heading font-bold text-slate-900">Employee Types</h1>
                  <p className="text-muted-foreground">Manage employee classifications and their leave settings</p>
                </div>
                <Button onClick={handleOpenCreateType} data-testid="button-create-type">
                  <Plus className="h-4 w-4 mr-2" /> Add Employee Type
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Employee Types</CardTitle>
                  <CardDescription>Define different categories of personnel (e.g., permanent, contractor, consultant)</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Leave Label</TableHead>
                      <TableHead>Has Leave Entitlement</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeTypes.map((type) => (
                      <TableRow key={type.id} data-testid={`row-type-${type.id}`}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>{type.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={type.leaveLabel === 'unavailable' ? 'secondary' : 'default'}>
                            {type.leaveLabel || 'leave'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {type.hasLeaveEntitlement === 'true' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          {type.isDefault === 'true' && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditType(type)} data-testid={`button-edit-type-${type.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteType(type.id)}
                            data-testid={`button-delete-type-${type.id}`}
                            disabled={type.isDefault === 'true'}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Leave Rules Section */}
          {activeSection === 'leave-rules' && (
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
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">Settings</h1>
                <p className="text-muted-foreground">Configure system notifications and attendance rules</p>
              </div>
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure email notifications for HR and Management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Notification Email Addresses</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea 
                        value={emailSettings} 
                        onChange={(e) => setEmailSettings(e.target.value)}
                        className="pl-9 min-h-[80px]"
                        placeholder="hr@company.com&#10;management@company.com&#10;supervisor@company.com"
                        data-testid="input-admin-email"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter one email address per line. All listed emails will receive leave requests and attendance notifications.
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {emailSettings.split('\n').filter(e => e.trim()).map((email, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {email.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive an email when a new request is submitted</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Cut-off Times</CardTitle>
                <CardDescription>Set the times for late arrivals and early departures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Clock-In Cut-off Time</Label>
                    <Input 
                      type="time"
                      value={clockInCutoff} 
                      onChange={(e) => setClockInCutoff(e.target.value)}
                      className="w-40"
                      data-testid="input-clock-in-cutoff"
                    />
                    <p className="text-xs text-muted-foreground">Workers clocking in after this time will be marked as late, and HR will be notified.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Clock-Out Cut-off Time</Label>
                    <Input 
                      type="time"
                      value={clockOutCutoff} 
                      onChange={(e) => setClockOutCutoff(e.target.value)}
                      className="w-40"
                      data-testid="input-clock-out-cutoff"
                    />
                    <p className="text-xs text-muted-foreground">Workers clocking out before this time will be flagged for early departure.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Message Templates</CardTitle>
                <CardDescription>Customize the messages sent to HR for attendance infringements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-2xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Late Arrival Message</Label>
                    <Textarea 
                      value={lateArrivalMessage} 
                      onChange={(e) => setLateArrivalMessage(e.target.value)}
                      rows={3}
                      placeholder="{firstName} {surname} (ID: {id}) clocked in late at {time}. Expected by {cutoff}."
                      data-testid="input-late-arrival-message"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Early Departure Message</Label>
                    <Textarea 
                      value={earlyDepartureMessage} 
                      onChange={(e) => setEarlyDepartureMessage(e.target.value)}
                      rows={3}
                      placeholder="{firstName} {surname} (ID: {id}) left early at {time}. Expected after {cutoff}."
                      data-testid="input-early-departure-message"
                    />
                  </div>

                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm font-medium mb-2">Available placeholders:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span><code className="bg-white px-1 rounded">{'{firstName}'}</code> - First name</span>
                      <span><code className="bg-white px-1 rounded">{'{surname}'}</code> - Surname</span>
                      <span><code className="bg-white px-1 rounded">{'{id}'}</code> - Employee ID</span>
                      <span><code className="bg-white px-1 rounded">{'{department}'}</code> - Department</span>
                      <span><code className="bg-white px-1 rounded">{'{time}'}</code> - Actual clock time</span>
                      <span><code className="bg-white px-1 rounded">{'{cutoff}'}</code> - Cut-off time</span>
                      <span><code className="bg-white px-1 rounded">{'{date}'}</code> - Date</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
                
            <Button onClick={handleSaveSettings} className="btn-industrial">
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </Button>
            </div>
          )}
        </div>
      </div>

      {/* Department Dialog */}
        <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deptName" className="text-right">Name</Label>
                <Input 
                  id="deptName" 
                  value={currentDept.name || ''} 
                  onChange={(e) => setCurrentDept({...currentDept, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., Assembly Line"
                  data-testid="input-dept-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deptDesc" className="text-right">Description</Label>
                <Input 
                  id="deptDesc" 
                  value={currentDept.description || ''} 
                  onChange={(e) => setCurrentDept({...currentDept, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional description"
                  data-testid="input-dept-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveDept} data-testid="button-save-department">
                {isEditingDept ? 'Save Changes' : 'Create Department'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Group Dialog */}
        <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditingGroup ? 'Edit User Group' : 'Add New User Group'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="groupName" className="text-right">Name</Label>
                <Input 
                  id="groupName" 
                  value={currentGroup.name || ''} 
                  onChange={(e) => setCurrentGroup({...currentGroup, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., HR Managers"
                  data-testid="input-group-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="groupDesc" className="text-right">Description</Label>
                <Input 
                  id="groupDesc" 
                  value={currentGroup.description || ''} 
                  onChange={(e) => setCurrentGroup({...currentGroup, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional description"
                  data-testid="input-group-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveGroup} data-testid="button-save-group">
                {isEditingGroup ? 'Save Changes' : 'Create User Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Employee Type Dialog */}
        <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditingType ? 'Edit Employee Type' : 'Add New Employee Type'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="typeName" className="text-right">Name</Label>
                <Input 
                  id="typeName" 
                  value={currentType.name || ''} 
                  onChange={(e) => setCurrentType({...currentType, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., Permanent Employee"
                  data-testid="input-type-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="typeDesc" className="text-right">Description</Label>
                <Input 
                  id="typeDesc" 
                  value={currentType.description || ''} 
                  onChange={(e) => setCurrentType({...currentType, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional description"
                  data-testid="input-type-description"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leaveLabel" className="text-right">Leave Label</Label>
                <div className="col-span-3">
                  <Select 
                    value={currentType.leaveLabel || 'leave'} 
                    onValueChange={(value) => setCurrentType({...currentType, leaveLabel: value})}
                  >
                    <SelectTrigger data-testid="select-leave-label">
                      <SelectValue placeholder="Select leave label" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leave">Leave (for permanent staff)</SelectItem>
                      <SelectItem value="unavailable">Unavailable (for contractors)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    "Leave" for permanent staff, "Unavailable" for contractors
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hasLeaveEntitlement" className="text-right">Has Leave Entitlement</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Switch 
                    id="hasLeaveEntitlement"
                    checked={currentType.hasLeaveEntitlement === 'true'}
                    onCheckedChange={(checked) => setCurrentType({...currentType, hasLeaveEntitlement: checked ? 'true' : 'false'})}
                    data-testid="switch-has-leave"
                  />
                  <span className="text-sm text-muted-foreground">
                    {currentType.hasLeaveEntitlement === 'true' ? 'Yes - Can accrue leave' : 'No - Cannot accrue leave'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isPermanent" className="text-right">Permanent Position</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Switch 
                    id="isPermanent"
                    checked={currentType.isPermanent === 'yes'}
                    onCheckedChange={(checked) => setCurrentType({...currentType, isPermanent: checked ? 'yes' : 'no'})}
                    data-testid="switch-is-permanent"
                  />
                  <span className="text-sm text-muted-foreground">
                    {currentType.isPermanent === 'yes' ? 'Yes - No contract end date required' : 'No - Requires contract end date'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveType} data-testid="button-save-type">
                {isEditingType ? 'Save Changes' : 'Create Employee Type'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <CardDescription>
                Configure different accrual rates based on employment tenure for: {currentPhaseRule?.name}
              </CardDescription>
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

        {/* Contract Management Dialog */}
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
                  {contractActionUser?.contractEndDate 
                    ? format(new Date(contractActionUser.contractEndDate), 'MMM d, yyyy')
                    : 'Not set'}
                </p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Action</Label>
                <div className="col-span-3">
                  <Select 
                    value={contractAction} 
                    onValueChange={(value: 'extend' | 'convert') => {
                      setContractAction(value);
                      if (value === 'convert') {
                        setContractNewTypeId(null);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-contract-action">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="extend">Extend Contract</SelectItem>
                      <SelectItem value="convert">Convert to Different Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {contractAction === 'convert' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">New Type</Label>
                  <div className="col-span-3">
                    <Select 
                      value={contractNewTypeId?.toString() || ''} 
                      onValueChange={(value) => setContractNewTypeId(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger data-testid="select-new-employee-type">
                        <SelectValue placeholder="Select new employee type" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} {type.isPermanent === 'yes' ? '(Permanent)' : '(Contract)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {(() => {
                const selectedNewType = employeeTypes.find(t => t.id === contractNewTypeId);
                const needsEndDate = contractAction === 'extend' || 
                  (contractAction === 'convert' && selectedNewType?.isPermanent === 'no');
                
                if (needsEndDate) {
                  return (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="contractNewEndDate" className="text-right">
                        New End Date
                      </Label>
                      <Input 
                        id="contractNewEndDate" 
                        type="date"
                        value={contractNewEndDate} 
                        onChange={(e) => setContractNewEndDate(e.target.value)}
                        className="col-span-3"
                        data-testid="input-new-end-date"
                      />
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contractReason" className="text-right">Reason</Label>
                <Input 
                  id="contractReason" 
                  value={contractReason} 
                  onChange={(e) => setContractReason(e.target.value)}
                  className="col-span-3"
                  placeholder="Reason for extension/conversion"
                  data-testid="input-contract-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsContractDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleContractAction} data-testid="button-save-contract">
                {contractAction === 'extend' ? 'Extend Contract' : 'Convert'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin User Dialog */}
        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Admin User</DialogTitle>
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
                  data-testid="input-admin-email-create"
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
                <Label htmlFor="id" className="text-right">ID Number</Label>
                <Input 
                  id="id" 
                  value={currentUser.id || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, id: e.target.value})}
                  className="col-span-3"
                  data-testid="input-id-number"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email {currentUser.userGroupId ? '*' : ''}</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={currentUser.email || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                  className="col-span-3"
                  placeholder={currentUser.userGroupId ? "Required for admin login" : "Optional"}
                  data-testid="input-email"
                />
              </div>
              {currentUser.userGroupId && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Password {!currentUser.password && !isEditing ? '*' : ''}</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={currentUser.password || ''} 
                    onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})}
                    className="col-span-3"
                    placeholder={isEditing ? "Leave blank to keep current password" : "Required for admin login"}
                    data-testid="input-password"
                  />
                </div>
              )}
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
                    onValueChange={(value) => setCurrentUser({...currentUser, department: value})}
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
                    <p className="text-xs text-muted-foreground mt-1">No departments available. Create one in the Departments tab first.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="empType" className="text-right">Employee Type</Label>
                <div className="col-span-3">
                  <Select 
                    value={currentUser.employeeTypeId?.toString() || ''} 
                    onValueChange={(value) => setCurrentUser({...currentUser, employeeTypeId: value ? parseInt(value) : undefined})}
                  >
                    <SelectTrigger data-testid="select-employee-type">
                      <SelectValue placeholder="Select employee type" />
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
                <Label htmlFor="userGroup" className="text-right">Admin Access</Label>
                <div className="col-span-3">
                  <Select 
                    value={currentUser.userGroupId?.toString() || 'none'} 
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setCurrentUser({...currentUser, userGroupId: undefined, role: 'worker'});
                      } else {
                        setCurrentUser({...currentUser, userGroupId: parseInt(value), role: 'manager'});
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-user-group">
                      <SelectValue placeholder="No admin access" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No admin access (Worker only)</SelectItem>
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
              {(() => {
                const selectedType = employeeTypes.find(t => t.id === currentUser.employeeTypeId);
                if (selectedType && selectedType.isPermanent === 'no') {
                  return (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="contractEndDate" className="text-right">Contract End Date</Label>
                      <div className="col-span-3">
                        <Input 
                          id="contractEndDate" 
                          type="date"
                          value={currentUser.contractEndDate || ''} 
                          onChange={(e) => setCurrentUser({...currentUser, contractEndDate: e.target.value})}
                          data-testid="input-contract-end-date"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Required for contract-based personnel. Set the expected contract end date.
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nationalId" className="text-right">National ID</Label>
                <Input 
                  id="nationalId" 
                  value={currentUser.nationalId || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, nationalId: e.target.value})}
                  className="col-span-3"
                  placeholder="ID / Passport number"
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
                  placeholder="Tax / PAYE number"
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
              <div className="grid grid-cols-4 items-start gap-4 pt-2">
                <Label className="text-right pt-2">Profile Photo</Label>
                <div className="col-span-3 space-y-3">
                  {isCapturingPhoto ? (
                    <div className="border rounded-lg p-2 bg-slate-50">
                      <WebcamCapture onCapture={handlePhotoCapture} label="Capture Profile Photo" />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2 text-red-500 hover:text-red-600"
                        onClick={() => setIsCapturingPhoto(false)}
                      >
                        Cancel Camera
                      </Button>
                    </div>
                  ) : currentUser.photoUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-slate-200 relative">
                          <img src={currentUser.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                          {extractingFace && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsCapturingPhoto(true)}
                            disabled={extractingFace}
                          >
                            <Camera className="mr-2 h-4 w-4" /> Retake Photo
                          </Button>
                          {faceExtracted && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Face recognition ready</span>
                            </div>
                          )}
                          {extractingFace && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Extracting face data...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full border-dashed py-8"
                      onClick={() => setIsCapturingPhoto(true)}
                    >
                      <Camera className="mr-2 h-5 w-5" /> Take Photo for Facial Rec
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveUser}>{isEditing ? 'Save Changes' : 'Create User'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Employee Leave Balance Dialog */}
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

        {/* Leave Request Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Leave Request Details</DialogTitle>
            </DialogHeader>
            {selectedLeaveRequest && (() => {
              const employee = users.find(u => u.id === selectedLeaveRequest.userId);
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Employee</Label>
                      <p className="font-medium">{employee ? `${employee.firstName} ${employee.surname}` : selectedLeaveRequest.userId}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Leave Type</Label>
                      <p className="font-medium capitalize">{selectedLeaveRequest.leaveType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Start Date</Label>
                      <p className="font-medium">{format(new Date(selectedLeaveRequest.startDate), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">End Date</Label>
                      <p className="font-medium">{format(new Date(selectedLeaveRequest.endDate), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Status</Label>
                      <Badge variant={
                        selectedLeaveRequest.status === 'approved' ? 'default' :
                        selectedLeaveRequest.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {selectedLeaveRequest.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Submitted</Label>
                      <p className="font-medium">{format(new Date(selectedLeaveRequest.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-sm">Reason</Label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-lg border">
                      <p>{selectedLeaveRequest.reason || 'No reason provided'}</p>
                    </div>
                  </div>

                  {selectedLeaveRequest.documents && selectedLeaveRequest.documents.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-sm">Supporting Documents</Label>
                      <div className="mt-2 space-y-2">
                        {selectedLeaveRequest.documents.map((doc, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                            <FileText className="h-4 w-4 text-blue-500" />
                            {doc.startsWith('data:') ? (
                              <a 
                                href={doc} 
                                download={`document-${index + 1}`}
                                className="text-blue-600 hover:underline"
                              >
                                Document {index + 1} (Click to download)
                              </a>
                            ) : (
                              <a 
                                href={doc} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {doc}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLeaveRequest.status === 'pending' && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          updateLeaveStatusMutation.mutate({ id: selectedLeaveRequest.id, status: 'rejected' });
                          setIsReviewDialogOpen(false);
                        }}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="mr-2 h-4 w-4" /> Reject
                      </Button>
                      <Button 
                        onClick={() => {
                          updateLeaveStatusMutation.mutate({ id: selectedLeaveRequest.id, status: 'approved' });
                          setIsReviewDialogOpen(false);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="mr-2 h-4 w-4" /> Approve
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
    </Layout>
  );
}
