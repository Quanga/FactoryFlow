import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
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
import { userApi, settingsApi, departmentApi, userGroupApi, leaveRequestApi, leaveBalanceApi, attendanceApi, employeeTypeApi, leaveRuleApi, leaveRulePhaseApi, contractHistoryApi, grievanceApi, publicHolidayApi, dashboardApi, backupApi, orgPositionApi } from '@/lib/api';
import type { User, Department, UserGroup, LeaveRequest, LeaveBalance, AttendanceRecord, EmployeeType, LeaveRule, LeaveRulePhase, ContractHistory, Grievance, PublicHoliday, OrgPosition } from '@shared/schema';
import { Plus, Pencil, Trash2, Save, Mail, Users, Settings, Camera, Building2, Loader2, CheckCircle2, UserCog, Shield, Calendar, Clock, FileText, Check, X, Search, ChevronDown, ChevronRight, LayoutDashboard, AlertTriangle, LogOut, UserX, Network, MessageSquareWarning, Eye, CalendarDays, TrendingUp, UserCheck, ClipboardList, Home, Download, Upload, Palette } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/lib/auth-context';
import WebcamCapture from '@/components/WebcamCapture';
import MultiAngleFaceCapture from '@/components/MultiAngleFaceCapture';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { loadFaceModels, extractFaceDescriptorFromBase64, descriptorToJson } from '@/lib/face-recognition';
import { faceDescriptorApi } from '@/lib/api';
import jsPDF from 'jspdf';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, setUser, logout } = useAuth();
  const queryClient = useQueryClient();
  
  // Server-side access control filters users based on X-User-Id header
  // The server checks hasFullAdminAccess and returns appropriate data
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const { data: emailSetting } = useQuery({
    queryKey: ['settings', 'admin_email'],
    queryFn: () => settingsApi.get('admin_email'),
  });

  const { data: senderEmailSetting } = useQuery({
    queryKey: ['settings', 'sender_email'],
    queryFn: () => settingsApi.get('sender_email'),
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

  const { data: timezoneSetting } = useQuery({
    queryKey: ['settings', 'timezone'],
    queryFn: () => settingsApi.get('timezone'),
  });

  const { data: companyNameSetting } = useQuery({
    queryKey: ['settings', 'company_name'],
    queryFn: () => settingsApi.get('company_name'),
  });

  const { data: companyLogoSetting } = useQuery({
    queryKey: ['settings', 'company_logo'],
    queryFn: () => settingsApi.get('company_logo'),
  });

  const { data: primaryColorSetting } = useQuery({
    queryKey: ['settings', 'primary_color'],
    queryFn: () => settingsApi.get('primary_color'),
  });

  const { data: accentColorSetting } = useQuery({
    queryKey: ['settings', 'accent_color'],
    queryFn: () => settingsApi.get('accent_color'),
  });

  const { data: termEmployeeSetting } = useQuery({
    queryKey: ['settings', 'term_employee'],
    queryFn: () => settingsApi.get('term_employee'),
  });

  const { data: termDepartmentSetting } = useQuery({
    queryKey: ['settings', 'term_department'],
    queryFn: () => settingsApi.get('term_department'),
  });

  const { data: termClockInSetting } = useQuery({
    queryKey: ['settings', 'term_clock_in'],
    queryFn: () => settingsApi.get('term_clock_in'),
  });

  const { data: termClockOutSetting } = useQuery({
    queryKey: ['settings', 'term_clock_out'],
    queryFn: () => settingsApi.get('term_clock_out'),
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

  const today = format(new Date(), 'yyyy-MM-dd');
  const [attendanceStartDate, setAttendanceStartDate] = useState(today);
  const [attendanceEndDate, setAttendanceEndDate] = useState(today);
  const [attendanceUserFilter, setAttendanceUserFilter] = useState('');
  const [attendanceInfringementFilter, setAttendanceInfringementFilter] = useState(false);

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance', attendanceStartDate, attendanceEndDate],
    queryFn: () => attendanceApi.getAll(attendanceStartDate || undefined, attendanceEndDate || undefined),
  });

  const { data: grievances = [] } = useQuery({
    queryKey: ['grievances'],
    queryFn: () => grievanceApi.getAll(),
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 60000,
  });

  const { data: publicHolidays = [] } = useQuery({
    queryKey: ['public-holidays'],
    queryFn: () => publicHolidayApi.getAll(),
  });

  const { data: orgPositions = [] } = useQuery<OrgPosition[]>({
    queryKey: ['org-positions'],
    queryFn: () => orgPositionApi.getAll(),
  });

  // Employee Search State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState<string>('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'active' | 'terminated'>('active');

  // Public Holiday State
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [currentHoliday, setCurrentHoliday] = useState<Partial<PublicHoliday>>({});
  const [isEditingHoliday, setIsEditingHoliday] = useState(false);
  
  // User Management State
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isMultiAngleCapture, setIsMultiAngleCapture] = useState(false);
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
  const [adminNotes, setAdminNotes] = useState('');

  // Grievance Management State
  const [isGrievanceDialogOpen, setIsGrievanceDialogOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [grievanceNotes, setGrievanceNotes] = useState('');
  const [grievanceResolution, setGrievanceResolution] = useState('');

  // Employee Balance View State
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [selectedEmployeeForBalance, setSelectedEmployeeForBalance] = useState<User | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [expandedLeaveBalanceEmployees, setExpandedLeaveBalanceEmployees] = useState<Set<string>>(new Set());

  // Navigation State
  const [activeSection, setActiveSection] = useState<'dashboard' | 'employees' | 'leave-requests' | 'attendance' | 'departments' | 'employee-types' | 'leave-rules' | 'grievances' | 'holidays' | 'leave-calendar' | 'positions' | 'settings'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'general' | 'user-groups' | 'branding'>('general');
  const [attendanceTab, setAttendanceTab] = useState<'records' | 'manual-entry' | 'trends'>('records');
  const [manualAttendanceDate, setManualAttendanceDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [manualAttendanceEntries, setManualAttendanceEntries] = useState<Record<string, { clockIn: string; clockOut: string }>>({});

  // Positions State
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);
  const [positionForm, setPositionForm] = useState({ title: '', department: '', parentPositionId: '', sortOrder: '0' });

  // Attendance Edit State
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
  const [editAttendanceTime, setEditAttendanceTime] = useState('');
  const [editAttendanceDate, setEditAttendanceDate] = useState('');
  const [editAttendanceType, setEditAttendanceType] = useState<'in' | 'out'>('in');
  const [editInfringementType, setEditInfringementType] = useState<string>('none');
  const [editInfringementReason, setEditInfringementReason] = useState('');

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

  // Termination State
  const [isTerminationDialogOpen, setIsTerminationDialogOpen] = useState(false);
  const [terminationUser, setTerminationUser] = useState<User | null>(null);
  const [terminationDate, setTerminationDate] = useState('');

  // Settings State
  const [emailSettings, setEmailSettings] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [clockInCutoff, setClockInCutoff] = useState('08:00');
  const [clockOutCutoff, setClockOutCutoff] = useState('17:00');
  const [lateArrivalMessage, setLateArrivalMessage] = useState('{name} (ID: {id}) clocked in late at {time}.');
  const [earlyDepartureMessage, setEarlyDepartureMessage] = useState('{name} (ID: {id}) left early at {time}.');
  const [timezone, setTimezone] = useState('Africa/Johannesburg');
  
  const [companyName, setCompanyName] = useState('AECE Checkpoint');
  const [companyLogo, setCompanyLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [termEmployee, setTermEmployee] = useState('Employee');
  const [termDepartment, setTermDepartment] = useState('Department');
  const [termClockIn, setTermClockIn] = useState('Clock In');
  const [termClockOut, setTermClockOut] = useState('Clock Out');

  useEffect(() => {
    if (emailSetting) {
      setEmailSettings(emailSetting.value);
    }
  }, [emailSetting]);

  useEffect(() => {
    if (senderEmailSetting) {
      setSenderEmail(senderEmailSetting.value);
    }
  }, [senderEmailSetting]);

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

  useEffect(() => {
    if (timezoneSetting) {
      setTimezone(timezoneSetting.value);
    }
  }, [timezoneSetting]);

  useEffect(() => {
    if (companyNameSetting) {
      setCompanyName(companyNameSetting.value);
    }
  }, [companyNameSetting]);

  useEffect(() => {
    if (companyLogoSetting) {
      setCompanyLogo(companyLogoSetting.value);
    }
  }, [companyLogoSetting]);

  useEffect(() => {
    if (primaryColorSetting) {
      setPrimaryColor(primaryColorSetting.value);
    }
  }, [primaryColorSetting]);

  useEffect(() => {
    if (accentColorSetting) {
      setAccentColor(accentColorSetting.value);
    }
  }, [accentColorSetting]);

  useEffect(() => {
    if (termEmployeeSetting) {
      setTermEmployee(termEmployeeSetting.value);
    }
  }, [termEmployeeSetting]);

  useEffect(() => {
    if (termDepartmentSetting) {
      setTermDepartment(termDepartmentSetting.value);
    }
  }, [termDepartmentSetting]);

  useEffect(() => {
    if (termClockInSetting) {
      setTermClockIn(termClockInSetting.value);
    }
  }, [termClockInSetting]);

  useEffect(() => {
    if (termClockOutSetting) {
      setTermClockOut(termClockOutSetting.value);
    }
  }, [termClockOutSetting]);

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
    onSuccess: async (createdUser) => {
      // Save additional face descriptors after user is created
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
      // Save additional face descriptors after user is updated
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

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => settingsApi.set(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: "Settings Saved", description: "Email configuration updated." });
    },
  });

  const updateLeaveStatusMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => 
      leaveRequestApi.updateStatus(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setAdminNotes('');
      toast({ title: "Leave Request Updated", description: "Status has been updated and notification sent." });
    },
  });

  const managerDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: 'approved' | 'rejected'; notes?: string }) => 
      leaveRequestApi.managerDecision(id, user?.id || '', decision, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setAdminNotes('');
      setIsReviewDialogOpen(false);
      toast({ 
        title: variables.decision === 'approved' ? "Request Approved" : "Request Rejected", 
        description: variables.decision === 'approved' 
          ? "Leave request has been approved and forwarded to HR for review." 
          : "Leave request has been rejected and the employee will be notified."
      });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to process decision" });
    },
  });

  const hrDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: 'approved' | 'rejected'; notes?: string }) => 
      leaveRequestApi.hrDecision(id, user?.id || '', decision, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setAdminNotes('');
      setIsReviewDialogOpen(false);
      toast({ 
        title: variables.decision === 'approved' ? "Request Approved" : "Request Rejected", 
        description: variables.decision === 'approved' 
          ? "Leave request has been approved and forwarded to MD for final approval." 
          : "Leave request has been rejected and the employee will be notified."
      });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to process decision" });
    },
  });

  const mdDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes, bypassHR }: { id: number; decision: 'approved' | 'rejected'; notes?: string; bypassHR?: boolean }) => 
      leaveRequestApi.mdDecision(id, user?.id || '', decision, notes, bypassHR),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setAdminNotes('');
      setIsReviewDialogOpen(false);
      toast({ 
        title: variables.decision === 'approved' ? "Leave Approved" : "Leave Rejected", 
        description: `Final decision recorded. The employee has been notified.`
      });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to process decision" });
    },
  });

  const adminCancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => 
      leaveRequestApi.adminCancel(id, user?.id || '', reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setAdminNotes('');
      setIsReviewDialogOpen(false);
      toast({ 
        title: "Leave Request Cancelled", 
        description: data.balanceAdjusted 
          ? "Leave request cancelled and leave balance has been credited back."
          : "Leave request has been cancelled."
      });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to cancel leave request" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => leaveRequestApi.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ 
        title: "Leave Request Deleted", 
        description: "Leave request has been permanently deleted."
      });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete leave request" });
    },
  });

  const createLeaveBalanceMutation = useMutation({
    mutationFn: (balance: { userId: string; leaveType: string; total: number }) => leaveBalanceApi.create(balance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: "Leave Balance Created", description: "New leave allocation has been added." });
    },
  });

  const updateGrievanceStatusMutation = useMutation({
    mutationFn: ({ id, status, adminNotes, resolution }: { id: number; status: string; adminNotes?: string; resolution?: string }) =>
      grievanceApi.updateStatus(id, status, adminNotes, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grievances'] });
      setIsGrievanceDialogOpen(false);
      setSelectedGrievance(null);
      setGrievanceNotes('');
      setGrievanceResolution('');
      toast({ title: "Grievance Updated", description: "The grievance status has been updated." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update grievance" });
    },
  });

  const updateLeaveBalanceMutation = useMutation({
    mutationFn: ({ id, total }: { id: number; total: number }) => leaveBalanceApi.update(id, { total }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: "Leave Balance Updated", description: "Leave allocation has been updated." });
    },
  });

  const bulkAttendanceMutation = useMutation({
    mutationFn: (records: { userId: string; type: string; timestamp: string }[]) => attendanceApi.createBulk(records),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setManualAttendanceEntries({});
      toast({ title: "Attendance Saved", description: `${data.length} attendance records have been saved.` });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save attendance records" });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { timestamp?: string; type?: string; isInfringement?: string | null; infringementReason?: string | null } }) => attendanceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setEditingAttendance(null);
      toast({ title: "Attendance Updated", description: "Attendance record has been corrected." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update attendance record" });
    },
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: (id: number) => attendanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: "Attendance Deleted", description: "Attendance record has been removed." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete attendance record" });
    },
  });

  const openEditAttendance = (record: AttendanceRecord) => {
    const timestamp = new Date(record.timestamp);
    setEditingAttendance(record);
    setEditAttendanceDate(format(timestamp, 'yyyy-MM-dd'));
    setEditAttendanceTime(format(timestamp, 'HH:mm'));
    setEditAttendanceType(record.type as 'in' | 'out');
    setEditInfringementType(record.isInfringement || 'none');
    setEditInfringementReason(record.infringementReason || '');
  };

  const handleSaveAttendanceEdit = () => {
    if (!editingAttendance) return;
    const [year, month, day] = editAttendanceDate.split('-').map(Number);
    const [hours, minutes] = editAttendanceTime.split(':').map(Number);
    const newTimestamp = new Date(year, month - 1, day, hours, minutes, 0);
    updateAttendanceMutation.mutate({
      id: editingAttendance.id,
      data: {
        timestamp: newTimestamp.toISOString(),
        type: editAttendanceType,
        isInfringement: editInfringementType === 'none' ? null : editInfringementType,
        infringementReason: editInfringementType === 'none' ? null : editInfringementReason,
      },
    });
  };

  const handleSaveManualAttendance = () => {
    const records: { userId: string; type: string; timestamp: string }[] = [];
    
    Object.entries(manualAttendanceEntries).forEach(([userId, entry]) => {
      if (entry.clockIn) {
        const [hours, minutes] = entry.clockIn.split(':').map(Number);
        const [year, month, day] = manualAttendanceDate.split('-').map(Number);
        const clockInDate = new Date(year, month - 1, day, hours, minutes, 0);
        records.push({ userId, type: 'in', timestamp: clockInDate.toISOString() });
      }
      if (entry.clockOut) {
        const [hours, minutes] = entry.clockOut.split(':').map(Number);
        const [year, month, day] = manualAttendanceDate.split('-').map(Number);
        const clockOutDate = new Date(year, month - 1, day, hours, minutes, 0);
        records.push({ userId, type: 'out', timestamp: clockOutDate.toISOString() });
      }
    });

    if (records.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "Please enter at least one clock-in or clock-out time." });
      return;
    }

    bulkAttendanceMutation.mutate(records);
  };

  const updateManualEntry = (userId: string, field: 'clockIn' | 'clockOut', value: string) => {
    setManualAttendanceEntries(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

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

  // Helper functions for date format conversion (dd/mm/yyyy <-> yyyy-mm-dd)
  const formatDateForDisplay = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const parseDateFromDisplay = (displayDate: string): string => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return displayDate;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const isValidDateFormat = (date: string): boolean => {
    if (!date) return true;
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(date);
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

  // Helper function to format leave request status for display
  const formatLeaveStatus = (status: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color?: string } => {
    switch (status) {
      case 'pending_manager':
        return { label: 'Pending Manager', variant: 'secondary' };
      case 'pending_hr':
        return { label: 'Pending HR', variant: 'secondary' };
      case 'pending_md':
        return { label: 'Pending MD', variant: 'secondary' };
      case 'approved':
        return { label: 'Approved', variant: 'default' };
      case 'rejected':
        return { label: 'Rejected', variant: 'destructive' };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'outline' };
      case 'pending':
        return { label: 'Pending', variant: 'secondary' };
      default:
        return { label: status, variant: 'secondary' };
    }
  };

  // Check if current user can take action on a leave request based on its status
  const canTakeAction = (request: LeaveRequest): { canAct: boolean; role: 'manager' | 'hr' | 'md' | null; stage: string } => {
    // For simplicity, all admins can act on all stages for now
    // In a real system, you'd check user group/role to determine which actions they can take
    const status = request.status;
    if (status === 'pending_manager') {
      return { canAct: true, role: 'manager', stage: 'Manager Review' };
    } else if (status === 'pending_hr') {
      return { canAct: true, role: 'hr', stage: 'HR Review' };
    } else if (status === 'pending_md') {
      return { canAct: true, role: 'md', stage: 'MD Approval' };
    }
    return { canAct: false, role: null, stage: '' };
  };

  // Count pending requests at each stage
  const pendingCounts = {
    manager: leaveRequests.filter((r: LeaveRequest) => r.status === 'pending_manager').length,
    hr: leaveRequests.filter((r: LeaveRequest) => r.status === 'pending_hr').length,
    md: leaveRequests.filter((r: LeaveRequest) => r.status === 'pending_md').length,
    total: leaveRequests.filter((r: LeaveRequest) => ['pending_manager', 'pending_hr', 'pending_md', 'pending'].includes(r.status)).length,
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

  // Public Holiday Mutations
  const createHolidayMutation = useMutation({
    mutationFn: publicHolidayApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: "Holiday Added", description: "Public holiday has been added successfully." });
      setIsHolidayDialogOpen(false);
      setCurrentHoliday({});
      setIsEditingHoliday(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateHolidayMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => publicHolidayApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: "Holiday Updated", description: "Public holiday has been updated successfully." });
      setIsHolidayDialogOpen(false);
      setCurrentHoliday({});
      setIsEditingHoliday(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: publicHolidayApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: "Holiday Deleted", description: "Public holiday has been removed." });
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
    
    // Use explicitly set role, default to 'worker' if not set
    const role = currentUser.role || 'worker';
    
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
      managerId: currentUser.managerId || null,
      orgPositionId: currentUser.orgPositionId || null,
      exclude: currentUser.exclude || false,
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

  const [pendingMultiAnglePhotos, setPendingMultiAnglePhotos] = useState<Array<{ angle: string; image: string; descriptor: string | null }>>([]);
  
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
    
    // Store additional photos for saving when user is saved
    const additionalPhotos = photos.filter(p => p.descriptor && p.angle !== 'center');
    setPendingMultiAnglePhotos(additionalPhotos);
    
    const capturedCount = photos.filter(p => p.descriptor).length;
    toast({ 
      title: "Face Registration Complete", 
      description: `Captured ${capturedCount} face angles for improved recognition accuracy.` 
    });
  };
  
  // Function to save additional face descriptors after user is created/updated
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
    await updateSettingMutation.mutateAsync({ key: 'sender_email', value: senderEmail });
    await updateSettingMutation.mutateAsync({ key: 'clock_in_cutoff', value: clockInCutoff });
    await updateSettingMutation.mutateAsync({ key: 'clock_out_cutoff', value: clockOutCutoff });
    await updateSettingMutation.mutateAsync({ key: 'late_arrival_message', value: lateArrivalMessage });
    await updateSettingMutation.mutateAsync({ key: 'early_departure_message', value: earlyDepartureMessage });
    await updateSettingMutation.mutateAsync({ key: 'timezone', value: timezone });
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

  // Positions Handlers
  const handleOpenCreatePosition = () => {
    setEditingPosition(null);
    setPositionForm({ title: '', department: '', parentPositionId: '', sortOrder: '0' });
    setPositionDialogOpen(true);
  };

  const handleOpenEditPosition = (pos: OrgPosition) => {
    setEditingPosition(pos);
    setPositionForm({
      title: pos.title,
      department: pos.department || '',
      parentPositionId: pos.parentPositionId ? String(pos.parentPositionId) : '',
      sortOrder: String(pos.sortOrder || 0),
    });
    setPositionDialogOpen(true);
  };

  const handleSavePosition = async () => {
    if (!positionForm.title) {
      toast({ variant: "destructive", title: "Error", description: "Position title is required" });
      return;
    }
    const payload = {
      title: positionForm.title,
      department: positionForm.department || null,
      parentPositionId: positionForm.parentPositionId ? Number(positionForm.parentPositionId) : null,
      sortOrder: Number(positionForm.sortOrder) || 0,
    };
    try {
      if (editingPosition) {
        await orgPositionApi.update(editingPosition.id, payload);
        toast({ title: "Success", description: "Position updated" });
      } else {
        await orgPositionApi.create(payload);
        toast({ title: "Success", description: "Position created" });
      }
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      setPositionDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleDeletePosition = async (id: number) => {
    if (!confirm('Are you sure you want to delete this position? Child positions will become root-level.')) return;
    try {
      await orgPositionApi.delete(id);
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      toast({ title: "Success", description: "Position deleted" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">AECE Checkpoint</h2>
              <div className="flex items-center gap-2">
                {user && <NotificationBell userId={user.id} />}
                <ThemeToggle />
              </div>
            </div>
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
                onClick={() => setLocation('/admin/org-chart')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-slate-100 text-slate-700"
                data-testid="nav-org-chart"
              >
                <Network className="h-4 w-4" /> Organization Chart
              </button>
              <button
                onClick={() => setLocation('/admin/leave-calendar')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-slate-100 text-slate-700"
                data-testid="nav-leave-calendar"
              >
                <CalendarDays className="h-4 w-4" /> Leave Calendar
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
                onClick={() => setLocation('/leave-request')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-slate-100 text-slate-700"
                data-testid="nav-apply-leave"
              >
                <Calendar className="h-4 w-4" /> Apply for Leave
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
                onClick={() => setLocation('/admin/reports')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-slate-100 text-slate-700"
                data-testid="nav-reports"
              >
                <TrendingUp className="h-4 w-4" /> Attendance Reports
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
                onClick={() => setActiveSection('leave-calendar')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'leave-calendar' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-leave-calendar"
              >
                <CalendarDays className="h-4 w-4" /> Leave Calendar
              </button>
              <button
                onClick={() => setActiveSection('holidays')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'holidays' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-holidays"
              >
                <CalendarDays className="h-4 w-4" /> Public Holidays
              </button>
              <button
                onClick={() => setActiveSection('positions')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'positions' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-positions"
              >
                <Network className="h-4 w-4" /> Org Positions
              </button>
              <button
                onClick={() => setActiveSection('grievances')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === 'grievances' ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                data-testid="nav-grievances"
              >
                <MessageSquareWarning className="h-4 w-4" /> Grievances
                {grievances.filter(g => g.status === 'submitted' || g.status === 'in_review').length > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs">
                    {grievances.filter(g => g.status === 'submitted' || g.status === 'in_review').length}
                  </Badge>
                )}
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
                  onClick={() => {
                    logout();
                    setLocation('/');
                  }}
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
                                  {request.leaveType} • {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d')}
                                </p>
                                <Badge variant={statusInfo.variant} className="text-xs mt-1">{statusInfo.label}</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedLeaveRequest(request);
                                  setAdminNotes('');
                                  setIsReviewDialogOpen(true);
                                }}
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
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Personnel</CardTitle>
                    <CardDescription>Manage personnel access, IDs, and leave balances</CardDescription>
                  </div>
                  <Button onClick={handleOpenCreate} className="btn-industrial bg-primary text-white">
                    <Plus className="mr-2 h-4 w-4" /> Add Person
                  </Button>
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name, ID, email, or mobile..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="max-w-sm"
                      data-testid="employee-search"
                    />
                  </div>
                  <Select value={employeeDepartmentFilter || 'all'} onValueChange={(v) => setEmployeeDepartmentFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-40" data-testid="employee-dept-filter">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d: Department) => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
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
                    {users
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
                          u.firstName?.toLowerCase().includes(search) ||
                          u.surname?.toLowerCase().includes(search) ||
                          u.nickname?.toLowerCase().includes(search) ||
                          u.id.toLowerCase().includes(search) ||
                          u.nationalId?.toLowerCase().includes(search) ||
                          u.email?.toLowerCase().includes(search) ||
                          u.mobile?.toLowerCase().includes(search)
                        );
                      })
                      .map((emp) => {
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
                              <span className="text-sm" title={emp.startDate ? `Started: ${format(new Date(emp.startDate), 'dd/MM/yyyy')}` : 'Start date not set'}>
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
                              {!emp.terminationDate && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    setTerminationUser(emp);
                                    setTerminationDate('');
                                    setIsTerminationDialogOpen(true);
                                  }} 
                                  title="Terminate"
                                  data-testid={`button-terminate-${emp.id}`}
                                >
                                  <UserX className="h-4 w-4 text-amber-600" />
                                </Button>
                              )}
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
                                      <p className="font-medium">{emp.startDate ? format(new Date(emp.startDate), 'dd/MM/yyyy') : 'Not set'}</p>
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
                                    {(() => {
                                      const empType = employeeTypes.find(t => t.id === emp.employeeTypeId);
                                      if (empType && empType.isPermanent === 'no') {
                                        const isExpired = emp.contractEndDate && new Date(emp.contractEndDate) < new Date();
                                        return (
                                          <>
                                            <div>
                                              <p className="text-xs text-muted-foreground">Contract End Date</p>
                                              <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                                                {emp.contractEndDate ? format(new Date(emp.contractEndDate), 'dd/MM/yyyy') : 'Not set'}
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

            {/* Terminated Personnel Section */}
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
                              {emp.terminationDate ? format(new Date(emp.terminationDate), 'dd/MM/yyyy') : '-'}
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
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(emp)} title="View Details">
                              <Pencil className="h-4 w-4 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(emp.id)} title="Delete Permanently">
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
                        const statusInfo = formatLeaveStatus(request.status);
                        const actionInfo = canTakeAction(request);
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
                              <Badge variant={statusInfo.variant}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedLeaveRequest(request);
                                  setAdminNotes('');
                                  setIsReviewDialogOpen(true);
                                }}
                                data-testid={`button-review-${request.id}`}
                                title="Review"
                              >
                                <FileText className="h-4 w-4 text-blue-500" />
                              </Button>
                              {actionInfo.canAct && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      if (actionInfo.role === 'manager') {
                                        managerDecisionMutation.mutate({ id: request.id, decision: 'approved' });
                                      } else if (actionInfo.role === 'hr') {
                                        hrDecisionMutation.mutate({ id: request.id, decision: 'approved' });
                                      } else if (actionInfo.role === 'md') {
                                        mdDecisionMutation.mutate({ id: request.id, decision: 'approved' });
                                      }
                                    }}
                                    data-testid={`button-approve-${request.id}`}
                                    title={`Approve (${actionInfo.stage})`}
                                  >
                                    <Check className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      if (actionInfo.role === 'manager') {
                                        managerDecisionMutation.mutate({ id: request.id, decision: 'rejected' });
                                      } else if (actionInfo.role === 'hr') {
                                        hrDecisionMutation.mutate({ id: request.id, decision: 'rejected' });
                                      } else if (actionInfo.role === 'md') {
                                        mdDecisionMutation.mutate({ id: request.id, decision: 'rejected' });
                                      }
                                    }}
                                    data-testid={`button-reject-${request.id}`}
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  if (confirm('Are you sure you want to permanently delete this leave request? This action cannot be undone.')) {
                                    permanentDeleteMutation.mutate(request.id);
                                  }
                                }}
                                data-testid={`button-delete-${request.id}`}
                                title="Permanently Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
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
                <p className="text-muted-foreground">View and manage employee attendance records</p>
              </div>
              
              {/* Clocked In Summary */}
              {(() => {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const eligibleEmployees = users.filter(u => !u.exclude && !u.terminationDate && u.attendanceRequired !== false);
                const todayRecords = attendanceRecords.filter((r: AttendanceRecord) => 
                  format(new Date(r.timestamp), 'yyyy-MM-dd') === todayStr
                );
                
                const clockedInUsers = new Set<string>();
                const clockedOutUsers = new Set<string>();
                
                todayRecords.forEach((record: AttendanceRecord) => {
                  if (record.type === 'in') {
                    clockedInUsers.add(record.userId);
                  } else if (record.type === 'out') {
                    clockedOutUsers.add(record.userId);
                  }
                });
                
                const currentlyClockedIn = Array.from(clockedInUsers).filter(
                  userId => !clockedOutUsers.has(userId)
                ).length;
                
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="bg-green-500 text-white rounded-full p-2">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-800">
                        {currentlyClockedIn} of {eligibleEmployees.length} employees clocked in
                      </p>
                      <p className="text-sm text-green-600">Currently on site today</p>
                    </div>
                  </div>
                );
              })()}
              
              {/* Attendance Sub-tabs */}
              <div className="flex gap-2 border-b pb-2">
                <button
                  onClick={() => setAttendanceTab('records')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    attendanceTab === 'records' 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="attendance-tab-records"
                >
                  <FileText className="inline h-4 w-4 mr-2" />
                  Records
                </button>
                <button
                  onClick={() => setAttendanceTab('manual-entry')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    attendanceTab === 'manual-entry' 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="attendance-tab-manual"
                >
                  <Plus className="inline h-4 w-4 mr-2" />
                  Manual Entry
                </button>
                <button
                  onClick={() => setAttendanceTab('trends')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    attendanceTab === 'trends' 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="attendance-tab-trends"
                >
                  <AlertTriangle className="inline h-4 w-4 mr-2" />
                  Trends
                </button>
              </div>
              
              {/* Records Tab */}
              {attendanceTab === 'records' && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
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
                          const clockInCutoffTime = clockInCutoff || '08:00';
                          const clockOutCutoffTime = clockOutCutoff || '17:00';
                          
                          const filteredRecords = attendanceRecords.filter((record: AttendanceRecord) => {
                            if (attendanceUserFilter && attendanceUserFilter !== 'all' && record.userId !== attendanceUserFilter) {
                              return false;
                            }
                            if (attendanceInfringementFilter) {
                              const recordTime = new Date(record.timestamp);
                              const timeStr = format(recordTime, 'HH:mm');
                              if (record.type === 'in') {
                                if (timeStr <= clockInCutoffTime) return false;
                              } else if (record.type === 'out') {
                                if (timeStr >= clockOutCutoffTime) return false;
                              }
                            }
                            return true;
                          });
                          
                          const eligibleEmployees = users.filter(u => !u.exclude && !u.terminationDate && u.attendanceRequired !== false);
                          const usersWithAttendance = new Set(filteredRecords.map((r: AttendanceRecord) => r.userId));
                          
                          type PdfConsolidated = {
                            employee: typeof users[0];
                            date: string;
                            clockInTime: string | null;
                            clockOutTime: string | null;
                            isNonAttendance: boolean;
                          };
                          
                          const pdfRecordsByUserAndDate = new Map<string, PdfConsolidated>();
                          
                          filteredRecords.forEach((record: AttendanceRecord) => {
                            const employee = users.find(u => u.id === record.userId);
                            if (!employee) return;
                            const dateStr = format(new Date(record.timestamp), 'yyyy-MM-dd');
                            const key = `${record.userId}-${dateStr}`;
                            
                            if (!pdfRecordsByUserAndDate.has(key)) {
                              pdfRecordsByUserAndDate.set(key, {
                                employee,
                                date: dateStr,
                                clockInTime: null,
                                clockOutTime: null,
                                isNonAttendance: false,
                              });
                            }
                            
                            const consolidated = pdfRecordsByUserAndDate.get(key)!;
                            const timeStr = format(new Date(record.timestamp), 'HH:mm');
                            if (record.type === 'in') {
                              if (!consolidated.clockInTime || timeStr < consolidated.clockInTime) {
                                consolidated.clockInTime = timeStr;
                              }
                            } else if (record.type === 'out') {
                              if (!consolidated.clockOutTime || timeStr > consolidated.clockOutTime) {
                                consolidated.clockOutTime = timeStr;
                              }
                            }
                          });
                          
                          eligibleEmployees.forEach(emp => {
                            if (attendanceUserFilter && attendanceUserFilter !== 'all' && emp.id !== attendanceUserFilter) {
                              return;
                            }
                            if (!usersWithAttendance.has(emp.id)) {
                              const dateStr = attendanceStartDate || format(new Date(), 'yyyy-MM-dd');
                              const key = `${emp.id}-${dateStr}`;
                              pdfRecordsByUserAndDate.set(key, {
                                employee: emp,
                                date: dateStr,
                                clockInTime: null,
                                clockOutTime: null,
                                isNonAttendance: true,
                              });
                            }
                          });
                          
                          const pdfConsolidated = Array.from(pdfRecordsByUserAndDate.values()).sort((a, b) => {
                            const dateCompare = b.date.localeCompare(a.date);
                            if (dateCompare !== 0) return dateCompare;
                            return a.employee.firstName.localeCompare(b.employee.firstName);
                          });
                          
                          const pdf = new jsPDF();
                          let dateRange = 'All Records';
                          if (attendanceStartDate && attendanceEndDate) {
                            dateRange = attendanceStartDate === attendanceEndDate 
                              ? format(new Date(attendanceStartDate), 'dd/MM/yyyy')
                              : `${format(new Date(attendanceStartDate), 'dd/MM/yyyy')} - ${format(new Date(attendanceEndDate), 'dd/MM/yyyy')}`;
                          } else if (attendanceStartDate) {
                            dateRange = `From ${format(new Date(attendanceStartDate), 'dd/MM/yyyy')}`;
                          } else if (attendanceEndDate) {
                            dateRange = `Until ${format(new Date(attendanceEndDate), 'dd/MM/yyyy')}`;
                          }
                          
                          pdf.setFontSize(18);
                          pdf.text('Attendance Report', 20, 20);
                          pdf.setFontSize(12);
                          pdf.text(`Date: ${dateRange}`, 20, 30);
                          pdf.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 38);
                          
                          let y = 50;
                          pdf.setFontSize(10);
                          pdf.setFont('helvetica', 'bold');
                          pdf.text('Employee', 20, y);
                          pdf.text('Date', 70, y);
                          pdf.text('Clock In', 105, y);
                          pdf.text('Clock Out', 130, y);
                          pdf.text('Status', 160, y);
                          y += 8;
                          pdf.setFont('helvetica', 'normal');
                          
                          const todayStr = format(new Date(), 'yyyy-MM-dd');
                          
                          pdfConsolidated.forEach((record) => {
                            const statuses: string[] = [];
                            const isToday = record.date === todayStr;
                            const isClockedIn = isToday && record.clockInTime && !record.clockOutTime && !record.isNonAttendance;
                            
                            if (isClockedIn) {
                              statuses.push('Clocked In');
                            }
                            
                            if (record.isNonAttendance) {
                              statuses.push('No Attendance');
                            } else {
                              if (record.clockInTime && record.clockInTime > clockInCutoffTime) {
                                statuses.push('Late Arrival');
                              }
                              if (record.clockOutTime && record.clockOutTime < clockOutCutoffTime) {
                                statuses.push('Early Departure');
                              }
                              if (!record.clockOutTime && record.clockInTime) {
                                statuses.push('No Clock Out');
                              }
                            }
                            
                            const hasIssue = statuses.filter(s => s !== 'Clocked In').length > 0;
                            if (attendanceInfringementFilter && !hasIssue) {
                              return;
                            }
                            
                            if (y > 270) {
                              pdf.addPage();
                              y = 20;
                            }
                            
                            const statusText = statuses.length > 0 ? statuses.join(', ') : 'On Time';
                            
                            pdf.text(`${record.employee.firstName} ${record.employee.surname}`, 20, y);
                            pdf.text(format(new Date(record.date), 'dd/MM/yyyy'), 70, y);
                            pdf.text(record.clockInTime || '-', 105, y);
                            pdf.text(record.clockOutTime || '-', 130, y);
                            pdf.text(statusText, 160, y);
                            y += 6;
                          });
                          
                          pdf.save(`attendance-${attendanceStartDate || format(new Date(), 'yyyy-MM-dd')}.pdf`);
                          toast({ title: "PDF Exported", description: "Attendance report has been downloaded." });
                        }}
                        data-testid="button-export-pdf"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Filter by Employee:</Label>
                      <Select value={attendanceUserFilter} onValueChange={setAttendanceUserFilter}>
                        <SelectTrigger className="w-[200px]" data-testid="select-user-filter">
                          <SelectValue placeholder="All employees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All employees</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.firstName} {u.surname} ({u.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="infringement-filter" 
                        checked={attendanceInfringementFilter}
                        onCheckedChange={setAttendanceInfringementFilter}
                        data-testid="switch-infringement-filter"
                      />
                      <Label htmlFor="infringement-filter" className="text-sm cursor-pointer">
                        Show infringements only
                      </Label>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAttendanceStartDate('');
                        setAttendanceEndDate('');
                        setAttendanceUserFilter('');
                        setAttendanceInfringementFilter(false);
                      }}
                      data-testid="button-clear-filters"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const clockInCutoffTime = clockInCutoff || '08:00';
                  const clockOutCutoffTime = clockOutCutoff || '17:00';
                  
                  const filteredRecords = attendanceRecords.filter((record: AttendanceRecord) => {
                    if (attendanceUserFilter && attendanceUserFilter !== 'all' && record.userId !== attendanceUserFilter) {
                      return false;
                    }
                    
                    if (attendanceInfringementFilter) {
                      const recordTime = new Date(record.timestamp);
                      const timeStr = format(recordTime, 'HH:mm');
                      
                      if (record.type === 'in') {
                        if (timeStr <= clockInCutoffTime) return false;
                      } else if (record.type === 'out') {
                        if (timeStr >= clockOutCutoffTime) return false;
                      }
                    }
                    
                    return true;
                  });
                  
                  const eligibleEmployees = users.filter(u => !u.exclude && !u.terminationDate && u.attendanceRequired !== false);
                  const usersWithAttendance = new Set(filteredRecords.map((r: AttendanceRecord) => r.userId));
                  
                  type ConsolidatedRecord = {
                    odId: string;
                    odIemployee: typeof users[0];
                    date: string;
                    clockInRecord: AttendanceRecord | null;
                    clockOutRecord: AttendanceRecord | null;
                    isNonAttendance: boolean;
                  };
                  
                  const recordsByUserAndDate = new Map<string, ConsolidatedRecord>();
                  
                  filteredRecords.forEach((record: AttendanceRecord) => {
                    const employee = users.find(u => u.id === record.userId);
                    if (!employee) return;
                    const dateStr = format(new Date(record.timestamp), 'yyyy-MM-dd');
                    const key = `${record.userId}-${dateStr}`;
                    
                    if (!recordsByUserAndDate.has(key)) {
                      recordsByUserAndDate.set(key, {
                        odId: key,
                        odIemployee: employee,
                        date: dateStr,
                        clockInRecord: null,
                        clockOutRecord: null,
                        isNonAttendance: false,
                      });
                    }
                    
                    const consolidated = recordsByUserAndDate.get(key)!;
                    if (record.type === 'in') {
                      if (!consolidated.clockInRecord || new Date(record.timestamp) < new Date(consolidated.clockInRecord.timestamp)) {
                        consolidated.clockInRecord = record;
                      }
                    } else if (record.type === 'out') {
                      if (!consolidated.clockOutRecord || new Date(record.timestamp) > new Date(consolidated.clockOutRecord.timestamp)) {
                        consolidated.clockOutRecord = record;
                      }
                    }
                  });
                  
                  eligibleEmployees.forEach(emp => {
                    if (attendanceUserFilter && attendanceUserFilter !== 'all' && emp.id !== attendanceUserFilter) {
                      return;
                    }
                    if (!usersWithAttendance.has(emp.id)) {
                      const dateStr = attendanceStartDate || format(new Date(), 'yyyy-MM-dd');
                      const key = `${emp.id}-${dateStr}`;
                      recordsByUserAndDate.set(key, {
                        odId: key,
                        odIemployee: emp,
                        date: dateStr,
                        clockInRecord: null,
                        clockOutRecord: null,
                        isNonAttendance: true,
                      });
                    }
                  });
                  
                  const consolidatedRecords = Array.from(recordsByUserAndDate.values()).sort((a, b) => {
                    const dateCompare = b.date.localeCompare(a.date);
                    if (dateCompare !== 0) return dateCompare;
                    return a.odIemployee.firstName.localeCompare(b.odIemployee.firstName);
                  });
                  
                  if (consolidatedRecords.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        {attendanceInfringementFilter 
                          ? "No attendance infringements found for the selected filters."
                          : "No attendance records found for the selected filters."}
                      </div>
                    );
                  }
                  
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Photos</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consolidatedRecords.map((record) => {
                          const clockInTime = record.clockInRecord ? format(new Date(record.clockInRecord.timestamp), 'HH:mm') : null;
                          const clockOutTime = record.clockOutRecord ? format(new Date(record.clockOutRecord.timestamp), 'HH:mm') : null;
                          
                          const issues: string[] = [];
                          if (record.isNonAttendance) {
                            issues.push('No Attendance');
                          } else {
                            if (clockInTime && clockInTime > clockInCutoffTime) {
                              issues.push('Late Arrival');
                            }
                            if (clockOutTime && clockOutTime < clockOutCutoffTime) {
                              issues.push('Early Departure');
                            }
                            if (!clockOutTime && record.clockInRecord) {
                              issues.push('No Clock Out');
                            }
                          }
                          
                          const hasIssue = issues.length > 0;
                          
                          if (attendanceInfringementFilter && !hasIssue) {
                            return null;
                          }
                          
                          const isToday = record.date === format(new Date(), 'yyyy-MM-dd');
                          const isClockedIn = isToday && record.clockInRecord && !record.clockOutRecord && !record.isNonAttendance;
                          
                          return (
                            <TableRow key={record.odId} data-testid={`row-attendance-${record.odId}`} className={hasIssue ? 'bg-red-50' : ''}>
                              <TableCell className="font-medium">
                                {record.odIemployee.firstName} {record.odIemployee.surname}
                              </TableCell>
                              <TableCell>
                                {format(new Date(record.date), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell>
                                {clockInTime ? (
                                  <span className={clockInTime > clockInCutoffTime ? 'text-red-600 font-medium' : ''}>
                                    {clockInTime}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {clockOutTime ? (
                                  <span className={clockOutTime < clockOutCutoffTime ? 'text-red-600 font-medium' : ''}>
                                    {clockOutTime}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {record.clockInRecord?.photoUrl ? (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <button className="relative group cursor-pointer" title="View clock-in photo" data-testid={`button-view-clockin-photo-${record.odId}`}>
                                          <img 
                                            src={record.clockInRecord.photoUrl} 
                                            alt="Clock-in" 
                                            className="w-10 h-10 rounded object-cover border-2 border-green-400"
                                          />
                                          <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">IN</span>
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                          <DialogTitle>Clock-In Photo - {record.odIemployee.firstName} {record.odIemployee.surname}</DialogTitle>
                                          <DialogDescription>
                                            {format(new Date(record.clockInRecord.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <img 
                                          src={record.clockInRecord.photoUrl} 
                                          alt="Clock-in verification" 
                                          className="w-full rounded-lg"
                                        />
                                      </DialogContent>
                                    </Dialog>
                                  ) : record.clockInRecord ? (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs border-2 border-green-200" title="No photo">
                                      IN
                                    </div>
                                  ) : null}
                                  {record.clockOutRecord?.photoUrl ? (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <button className="relative group cursor-pointer" title="View clock-out photo" data-testid={`button-view-clockout-photo-${record.odId}`}>
                                          <img 
                                            src={record.clockOutRecord.photoUrl} 
                                            alt="Clock-out" 
                                            className="w-10 h-10 rounded object-cover border-2 border-blue-400"
                                          />
                                          <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] px-1 rounded">OUT</span>
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                          <DialogTitle>Clock-Out Photo - {record.odIemployee.firstName} {record.odIemployee.surname}</DialogTitle>
                                          <DialogDescription>
                                            {format(new Date(record.clockOutRecord.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <img 
                                          src={record.clockOutRecord.photoUrl} 
                                          alt="Clock-out verification" 
                                          className="w-full rounded-lg"
                                        />
                                      </DialogContent>
                                    </Dialog>
                                  ) : record.clockOutRecord ? (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs border-2 border-blue-200" title="No photo">
                                      OUT
                                    </div>
                                  ) : null}
                                  {!record.clockInRecord && !record.clockOutRecord && (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1">
                                    {isClockedIn && (
                                      <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">Clocked In</Badge>
                                    )}
                                    {hasIssue ? (
                                      <>
                                        {issues.map((issue, idx) => (
                                          <Badge key={idx} variant="destructive" className="text-xs">{issue}</Badge>
                                        ))}
                                      </>
                                    ) : (
                                      !isClockedIn && <Badge variant="outline" className="text-green-600 border-green-300">On Time</Badge>
                                    )}
                                  </div>
                                  {(record.clockInRecord?.infringementReason || record.clockOutRecord?.infringementReason) && (
                                    <p className="text-xs text-muted-foreground italic truncate max-w-[200px]" title={record.clockInRecord?.infringementReason || record.clockOutRecord?.infringementReason || ''}>
                                      Reason: {record.clockInRecord?.infringementReason || record.clockOutRecord?.infringementReason}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {!record.isNonAttendance && (
                                  <div className="flex justify-end gap-1">
                                    {record.clockInRecord && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditAttendance(record.clockInRecord!)}
                                        title="Edit clock-in"
                                        data-testid={`button-edit-clockin-${record.odId}`}
                                      >
                                        <Pencil className="h-4 w-4 text-slate-500" />
                                      </Button>
                                    )}
                                    {record.clockOutRecord && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditAttendance(record.clockOutRecord!)}
                                        title="Edit clock-out"
                                        data-testid={`button-edit-clockout-${record.odId}`}
                                      >
                                        <Pencil className="h-4 w-4 text-blue-500" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
              )}
              
              {/* Manual Entry Tab */}
              {attendanceTab === 'manual-entry' && (
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between w-full">
                  <div>
                    <CardTitle>Manual Attendance Entry</CardTitle>
                    <CardDescription>Enter clock-in/clock-out times for multiple employees at once</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Label className="text-sm">Date:</Label>
                    <Input
                      type="date"
                      value={manualAttendanceDate}
                      onChange={(e) => setManualAttendanceDate(e.target.value)}
                      className="w-40"
                      data-testid="input-manual-date"
                    />
                    <Button
                      onClick={handleSaveManualAttendance}
                      disabled={bulkAttendanceMutation.isPending || Object.keys(manualAttendanceEntries).length === 0}
                      className="btn-industrial"
                      data-testid="button-save-manual-attendance"
                    >
                      {bulkAttendanceMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save Attendance</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="w-[150px]">Clock In</TableHead>
                        <TableHead className="w-[150px]">Clock Out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(u => !u.exclude && !u.terminationDate && u.attendanceRequired !== false).map((employee) => (
                        <TableRow key={employee.id} data-testid={`row-manual-${employee.id}`}>
                          <TableCell className="font-mono text-sm">{employee.id}</TableCell>
                          <TableCell className="font-medium">{employee.firstName} {employee.surname}</TableCell>
                          <TableCell className="text-muted-foreground">{employee.department || '-'}</TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={manualAttendanceEntries[employee.id]?.clockIn || ''}
                              onChange={(e) => updateManualEntry(employee.id, 'clockIn', e.target.value)}
                              className="w-full"
                              data-testid={`input-clockin-${employee.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={manualAttendanceEntries[employee.id]?.clockOut || ''}
                              onChange={(e) => updateManualEntry(employee.id, 'clockOut', e.target.value)}
                              className="w-full"
                              data-testid={`input-clockout-${employee.id}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Enter clock-in and/or clock-out times for each employee. Leave fields empty if no entry is needed. All times will be recorded for the selected date.
                </p>
              </CardContent>
            </Card>
              )}
              
              {/* Trends Tab */}
              {attendanceTab === 'trends' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Trends</CardTitle>
                    <CardDescription>View infringement patterns and attendance trends over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const clockInCutoffTime = clockInCutoff || '08:00';
                      const clockOutCutoffTime = clockOutCutoff || '17:00';
                      
                      // Calculate infringements per employee
                      const infringementsByEmployee = new Map<string, { late: number; early: number; total: number }>();
                      
                      attendanceRecords.forEach((record: AttendanceRecord) => {
                        const recordTime = new Date(record.timestamp);
                        const timeStr = format(recordTime, 'HH:mm');
                        
                        let isInfringement = false;
                        let type: 'late' | 'early' | null = null;
                        
                        if (record.type === 'in' && timeStr > clockInCutoffTime) {
                          isInfringement = true;
                          type = 'late';
                        } else if (record.type === 'out' && timeStr < clockOutCutoffTime) {
                          isInfringement = true;
                          type = 'early';
                        }
                        
                        if (isInfringement && type) {
                          const current = infringementsByEmployee.get(record.userId) || { late: 0, early: 0, total: 0 };
                          if (type === 'late') current.late++;
                          if (type === 'early') current.early++;
                          current.total++;
                          infringementsByEmployee.set(record.userId, current);
                        }
                      });
                      
                      // Sort by total infringements (highest first)
                      const sortedInfringements = Array.from(infringementsByEmployee.entries())
                        .sort((a, b) => b[1].total - a[1].total);
                      
                      if (sortedInfringements.length === 0) {
                        return (
                          <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                            <p className="text-lg font-medium">No infringements detected</p>
                            <p className="text-sm">All employees are clocking in and out on time based on the configured cutoff times.</p>
                            <p className="text-xs mt-2">Clock-in cutoff: {clockInCutoffTime} | Clock-out cutoff: {clockOutCutoffTime}</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <p className="text-sm text-red-600 font-medium">Total Late Arrivals</p>
                              <p className="text-3xl font-bold text-red-700">
                                {sortedInfringements.reduce((sum, [_, data]) => sum + data.late, 0)}
                              </p>
                              <p className="text-xs text-red-500">After {clockInCutoffTime}</p>
                            </div>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <p className="text-sm text-orange-600 font-medium">Total Early Departures</p>
                              <p className="text-3xl font-bold text-orange-700">
                                {sortedInfringements.reduce((sum, [_, data]) => sum + data.early, 0)}
                              </p>
                              <p className="text-xs text-orange-500">Before {clockOutCutoffTime}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                              <p className="text-sm text-slate-600 font-medium">Employees with Infringements</p>
                              <p className="text-3xl font-bold text-slate-700">
                                {sortedInfringements.length}
                              </p>
                              <p className="text-xs text-slate-500">Out of {users.filter(u => !u.terminationDate).length} active</p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Employees with Ongoing Infringements</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Employee</TableHead>
                                  <TableHead>Department</TableHead>
                                  <TableHead className="text-center">Late Arrivals</TableHead>
                                  <TableHead className="text-center">Early Departures</TableHead>
                                  <TableHead className="text-center">Total</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedInfringements.map(([userId, data]) => {
                                  const emp = users.find(u => u.id === userId);
                                  if (!emp) return null;
                                  
                                  const severity = data.total >= 5 ? 'critical' : data.total >= 3 ? 'warning' : 'minor';
                                  
                                  return (
                                    <TableRow key={userId} className={severity === 'critical' ? 'bg-red-50' : severity === 'warning' ? 'bg-orange-50' : ''}>
                                      <TableCell className="font-medium">
                                        {emp.firstName} {emp.surname}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {emp.department || '-'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {data.late > 0 ? (
                                          <Badge variant="destructive">{data.late}</Badge>
                                        ) : (
                                          <span className="text-muted-foreground">0</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {data.early > 0 ? (
                                          <Badge className="bg-orange-500">{data.early}</Badge>
                                        ) : (
                                          <span className="text-muted-foreground">0</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center font-bold">
                                        {data.total}
                                      </TableCell>
                                      <TableCell>
                                        {severity === 'critical' ? (
                                          <Badge variant="destructive">Requires Attention</Badge>
                                        ) : severity === 'warning' ? (
                                          <Badge className="bg-orange-500">Monitor</Badge>
                                        ) : (
                                          <Badge variant="outline">Minor</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            Note: Infringements are calculated based on the date range selected in the Records tab. 
                            Currently showing data from {attendanceStartDate ? format(new Date(attendanceStartDate), 'dd/MM/yyyy') : 'all time'} 
                            to {attendanceEndDate ? format(new Date(attendanceEndDate), 'dd/MM/yyyy') : 'now'}.
                          </p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
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

          {/* Grievances Section */}
          {activeSection === 'grievances' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">Grievances</h1>
                <p className="text-muted-foreground">Review and manage employee grievances and complaints</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Grievances</CardTitle>
                  <CardDescription>Employee complaints and concerns requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {grievances.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquareWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No grievances have been submitted yet.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Against</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grievances.map((grievance) => {
                          const employee = users.find(u => u.id === grievance.userId);
                          const targetEmployee = grievance.targetEmployeeId ? users.find(u => u.id === grievance.targetEmployeeId) : null;
                          return (
                            <TableRow key={grievance.id}>
                              <TableCell className="text-sm">
                                {format(new Date(grievance.submittedAt), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{employee?.firstName} {employee?.surname}</div>
                                <div className="text-xs text-muted-foreground">{employee?.id}</div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{grievance.title}</TableCell>
                              <TableCell className="capitalize">{grievance.category.replace('_', ' ')}</TableCell>
                              <TableCell>
                                {grievance.targetType === 'company' ? (
                                  <Badge variant="outline">Company</Badge>
                                ) : (
                                  <span className="text-sm">{targetEmployee?.firstName} {targetEmployee?.surname}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  grievance.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                  grievance.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  grievance.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }>
                                  {grievance.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  grievance.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                                  grievance.status === 'in_review' ? 'bg-blue-100 text-blue-700' :
                                  grievance.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                  grievance.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }>
                                  {grievance.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedGrievance(grievance);
                                    setGrievanceNotes(grievance.adminNotes || '');
                                    setGrievanceResolution(grievance.resolution || '');
                                    setIsGrievanceDialogOpen(true);
                                  }}
                                  data-testid={`button-view-grievance-${grievance.id}`}
                                >
                                  <Eye className="h-4 w-4" />
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

          {/* Leave Calendar Section */}
          {activeSection === 'leave-calendar' && (
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
                  {(() => {
                    const today = new Date();
                    const currentMonth = today.getMonth();
                    const currentYear = today.getFullYear();
                    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    
                    const approvedLeaves = leaveRequests.filter((lr: LeaveRequest) => lr.status === 'approved');
                    const monthHolidays = publicHolidays.filter((h: PublicHoliday) => {
                      const hDate = new Date(h.date);
                      return hDate.getMonth() === currentMonth && hDate.getFullYear() === currentYear;
                    });
                    
                    return (
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
                                const emp = users.find(u => u.id === lr.userId);
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
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Public Holidays Section */}
          {activeSection === 'holidays' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-slate-100">Public Holidays</h1>
                  <p className="text-muted-foreground">Manage public holidays that affect leave calculations</p>
                </div>
                <Button onClick={() => { setCurrentHoliday({}); setIsEditingHoliday(false); setIsHolidayDialogOpen(true); }} data-testid="add-holiday">
                  <Plus className="h-4 w-4 mr-2" /> Add Holiday
                </Button>
              </div>
              
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Recurring</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {publicHolidays.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No public holidays configured. Add holidays to exclude them from leave calculations.
                          </TableCell>
                        </TableRow>
                      ) : (
                        publicHolidays.map((holiday: PublicHoliday) => (
                          <TableRow key={holiday.id} data-testid={`holiday-row-${holiday.id}`}>
                            <TableCell className="font-mono">
                              {format(new Date(holiday.date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="font-medium">{holiday.name}</TableCell>
                            <TableCell className="text-muted-foreground">{holiday.description || '-'}</TableCell>
                            <TableCell>
                              {holiday.isRecurring ? (
                                <Badge variant="secondary">Annual</Badge>
                              ) : (
                                <Badge variant="outline">One-time</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentHoliday(holiday);
                                    setIsEditingHoliday(true);
                                    setIsHolidayDialogOpen(true);
                                  }}
                                  data-testid={`edit-holiday-${holiday.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                                  data-testid={`delete-holiday-${holiday.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              {/* Holiday Dialog */}
              <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isEditingHoliday ? 'Edit Holiday' : 'Add Public Holiday'}</DialogTitle>
                    <DialogDescription>
                      {isEditingHoliday ? 'Update the holiday details.' : 'Add a new public holiday to the system.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Holiday Name</Label>
                      <Input
                        value={currentHoliday.name || ''}
                        onChange={(e) => setCurrentHoliday({ ...currentHoliday, name: e.target.value })}
                        placeholder="e.g. New Year's Day"
                        data-testid="holiday-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={currentHoliday.date || ''}
                        onChange={(e) => setCurrentHoliday({ ...currentHoliday, date: e.target.value })}
                        data-testid="holiday-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Input
                        value={currentHoliday.description || ''}
                        onChange={(e) => setCurrentHoliday({ ...currentHoliday, description: e.target.value })}
                        placeholder="Brief description"
                        data-testid="holiday-description"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={currentHoliday.isRecurring || false}
                        onCheckedChange={(checked) => setCurrentHoliday({ ...currentHoliday, isRecurring: checked })}
                        data-testid="holiday-recurring"
                      />
                      <Label>Recurring annually (same date each year)</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsHolidayDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        if (!currentHoliday.name || !currentHoliday.date) {
                          toast({ variant: 'destructive', title: 'Error', description: 'Name and date are required' });
                          return;
                        }
                        if (isEditingHoliday && currentHoliday.id) {
                          updateHolidayMutation.mutate({ id: currentHoliday.id, ...currentHoliday });
                        } else {
                          createHolidayMutation.mutate(currentHoliday);
                        }
                      }}
                      data-testid="save-holiday"
                    >
                      {isEditingHoliday ? 'Update' : 'Add'} Holiday
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Positions Section */}
          {activeSection === 'positions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-heading font-bold text-slate-900">Org Positions</h1>
                  <p className="text-muted-foreground">Define the position-based hierarchy for the org chart. When positions exist, the org chart uses them instead of the manager-based tree.</p>
                </div>
                <Button onClick={handleOpenCreatePosition} data-testid="button-add-position">
                  <Plus className="h-4 w-4 mr-2" /> Add Position
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Positions ({orgPositions.length})</CardTitle>
                  <CardDescription>Each position can have a parent position and an assigned employee. Unassigned positions appear as "Vacant" in the org chart.</CardDescription>
                </CardHeader>
                <CardContent>
                  {orgPositions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No positions defined yet. The org chart will use the manager-based hierarchy. Add positions to switch to a position-based org chart.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Parent Position</TableHead>
                          <TableHead>Assigned Employee</TableHead>
                          <TableHead>Sort Order</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orgPositions
                          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                          .map((pos) => {
                            const parentPos = orgPositions.find(p => p.id === pos.parentPositionId);
                            const assignedUsers = users.filter(u => u.orgPositionId === pos.id && !u.terminationDate);
                            const isFilled = assignedUsers.length > 0;
                            return (
                              <TableRow key={pos.id} data-testid={`row-position-${pos.id}`}>
                                <TableCell className="font-medium">{pos.title}</TableCell>
                                <TableCell>{pos.department || '-'}</TableCell>
                                <TableCell>{parentPos ? parentPos.title : <span className="text-muted-foreground italic">Root</span>}</TableCell>
                                <TableCell>
                                  {isFilled ? (
                                    <div className="space-y-0.5">
                                      {assignedUsers.map((u) => (
                                        <div key={u.id} className="text-sm">{u.firstName} {u.surname}</div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-red-500 italic">Vacant</span>
                                  )}
                                </TableCell>
                                <TableCell>{pos.sortOrder || 0}</TableCell>
                                <TableCell>
                                  {isFilled ? (
                                    <Badge variant="default" className="bg-green-600">{assignedUsers.length} assigned</Badge>
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
                  )}
                </CardContent>
              </Card>

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
                      <Select value={positionForm.department} onValueChange={(v) => setPositionForm(f => ({ ...f, department: v === '__none__' ? '' : v }))}>
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
                      <Select value={positionForm.parentPositionId} onValueChange={(v) => setPositionForm(f => ({ ...f, parentPositionId: v === '__none__' ? '' : v }))}>
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
                      <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded p-2">
                        Employees are assigned to positions from the employee edit page, not here. This page is for defining position names and hierarchy only.
                      </p>
                    </div>
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
                      <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first among siblings</p>
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
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">Settings</h1>
                <p className="text-muted-foreground">Configure system settings and manage user groups</p>
              </div>
              
              {/* Settings Sub-tabs */}
              <div className="flex gap-2 border-b pb-2">
                <button
                  onClick={() => setSettingsTab('general')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    settingsTab === 'general' 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="settings-tab-general"
                >
                  <Settings className="inline h-4 w-4 mr-2" />
                  General
                </button>
                <button
                  onClick={() => setSettingsTab('user-groups')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    settingsTab === 'user-groups' 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="settings-tab-user-groups"
                >
                  <Shield className="inline h-4 w-4 mr-2" />
                  User Groups
                </button>
                <button
                  onClick={() => setSettingsTab('branding')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    settingsTab === 'branding' 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="settings-tab-branding"
                >
                  <Palette className="inline h-4 w-4 mr-2" />
                  Branding
                </button>
              </div>
              
              {/* General Settings Tab */}
              {settingsTab === 'general' && (
              <>
            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>Configure timezone and regional preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Time Zone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="w-full" data-testid="select-timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</SelectItem>
                        <SelectItem value="Africa/Cairo">Africa/Cairo (EET, UTC+2)</SelectItem>
                        <SelectItem value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</SelectItem>
                        <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</SelectItem>
                        <SelectItem value="Africa/Casablanca">Africa/Casablanca (WET, UTC+0/+1)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT/BST, UTC+0/+1)</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris (CET/CEST, UTC+1/+2)</SelectItem>
                        <SelectItem value="Europe/Berlin">Europe/Berlin (CET/CEST, UTC+1/+2)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</SelectItem>
                        <SelectItem value="Asia/Singapore">Asia/Singapore (SGT, UTC+8)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</SelectItem>
                        <SelectItem value="Australia/Sydney">Australia/Sydney (AEST/AEDT, UTC+10/+11)</SelectItem>
                        <SelectItem value="America/New_York">America/New York (EST/EDT, UTC-5/-4)</SelectItem>
                        <SelectItem value="America/Chicago">America/Chicago (CST/CDT, UTC-6/-5)</SelectItem>
                        <SelectItem value="America/Denver">America/Denver (MST/MDT, UTC-7/-6)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los Angeles (PST/PDT, UTC-8/-7)</SelectItem>
                        <SelectItem value="Pacific/Auckland">Pacific/Auckland (NZST/NZDT, UTC+12/+13)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      All times in the application will be displayed in this timezone.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure email notifications for HR and Management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sender Email Address (FROM)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="email"
                        value={senderEmail} 
                        onChange={(e) => setSenderEmail(e.target.value)}
                        className="pl-9"
                        placeholder="noreply@yourcompany.com"
                        data-testid="input-sender-email"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This email address will appear as the sender for all system notifications.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Notification Recipients (TO)</Label>
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

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
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
                      placeholder="{firstName} {surname} (ID: {id}) clocked in late at {time}."
                      data-testid="input-late-arrival-message"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Early Departure Message</Label>
                    <Textarea 
                      value={earlyDepartureMessage} 
                      onChange={(e) => setEarlyDepartureMessage(e.target.value)}
                      rows={3}
                      placeholder="{firstName} {surname} (ID: {id}) left early at {time}."
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

            <Card>
              <CardHeader>
                <CardTitle>Backup & Restore</CardTitle>
                <CardDescription>Export or import your database including all records and images</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Export Backup</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Download a complete backup of all data including employees, departments, leave requests, attendance records, and photos.
                    </p>
                    <Button 
                      onClick={async () => {
                        try {
                          toast({ title: "Exporting...", description: "Preparing your backup file" });
                          const blob = await backupApi.export();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `aece-backup-${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast({ title: "Backup Exported", description: "Your backup file has been downloaded" });
                        } catch (error) {
                          toast({ variant: "destructive", title: "Export Failed", description: "Could not export backup" });
                        }
                      }}
                      className="w-full"
                      data-testid="backup-export"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download Backup
                    </Button>
                  </div>
                  
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Import Backup</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Restore data from a previously exported backup file. Existing records will be preserved.
                    </p>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".json"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          try {
                            const text = await file.text();
                            const backup = JSON.parse(text);
                            
                            const validation = await backupApi.validate(backup);
                            if (!validation.valid) {
                              toast({ variant: "destructive", title: "Invalid Backup", description: "The selected file is not a valid backup" });
                              return;
                            }
                            
                            const totalRecords = Object.values(validation.counts).reduce((a, b) => a + b, 0);
                            if (window.confirm(`Import backup from ${validation.exportedAt}?\n\nThis backup contains:\n- ${validation.counts.users || 0} users\n- ${validation.counts.departments || 0} departments\n- ${validation.counts.leaveRequests || 0} leave requests\n- ${validation.counts.attendanceRecords || 0} attendance records\n- ${totalRecords} total records\n\nExisting records will be preserved.`)) {
                              toast({ title: "Importing...", description: "Restoring your backup" });
                              const result = await backupApi.import(backup);
                              
                              queryClient.invalidateQueries();
                              toast({ title: "Backup Imported", description: result.message });
                            }
                          } catch (error) {
                            toast({ variant: "destructive", title: "Import Failed", description: "Could not import backup file" });
                          }
                          
                          e.target.value = '';
                        }}
                        className="cursor-pointer"
                        data-testid="backup-import"
                      />
                      <p className="text-xs text-muted-foreground">Select a .json backup file</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Backup files include all photos and face data encoded as base64. Large databases may result in large backup files.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bulk Leave Balance Import</CardTitle>
                <CardDescription>Import leave balances from a CSV file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with columns: <code className="bg-slate-100 px-1 rounded">employeeId, leaveType, total, taken, pending</code>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Example: <code className="bg-slate-100 px-1 rounded">EMP001,Annual Leave,15,5,0</code>
                  </p>
                </div>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const text = await file.text();
                      const lines = text.trim().split('\n');
                      
                      // Skip header if present
                      const hasHeader = lines[0].toLowerCase().includes('employeeid') || lines[0].toLowerCase().includes('leavetype');
                      const dataLines = hasHeader ? lines.slice(1) : lines;

                      const records = dataLines.map(line => {
                        const [employeeId, leaveType, total, taken, pending] = line.split(',').map(s => s.trim());
                        return {
                          employeeId,
                          leaveType,
                          total: parseFloat(total) || 0,
                          taken: parseFloat(taken) || 0,
                          pending: parseFloat(pending) || 0,
                        };
                      }).filter(r => r.employeeId && r.leaveType);

                      if (records.length === 0) {
                        toast({ variant: "destructive", title: "No Valid Records", description: "No valid records found in the CSV file" });
                        return;
                      }

                      if (window.confirm(`Import ${records.length} leave balance records?\n\nThis will update existing balances or create new ones.`)) {
                        toast({ title: "Importing...", description: `Processing ${records.length} records` });
                        const result = await leaveBalanceApi.bulkImport(records);
                        
                        queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
                        
                        let message = `Imported: ${result.imported}, Updated: ${result.updated}`;
                        if (result.errors.length > 0) {
                          message += `\nErrors: ${result.errors.length}`;
                          console.log('Import errors:', result.errors);
                        }
                        
                        toast({ 
                          title: "Import Complete", 
                          description: message,
                          variant: result.errors.length > 0 ? "destructive" : "default"
                        });
                      }
                    } catch (error) {
                      toast({ variant: "destructive", title: "Import Failed", description: "Could not process CSV file" });
                    }
                    
                    e.target.value = '';
                  }}
                  className="cursor-pointer"
                  data-testid="leave-balance-import"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const template = "employeeId,leaveType,total,taken,pending\nEMP001,Annual Leave,15,5,0\nEMP001,Sick Leave,12,2,0\nEMP002,Annual Leave,20,3,1";
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'leave-balance-template.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  data-testid="download-leave-template"
                >
                  <Download className="mr-2 h-4 w-4" /> Download Template
                </Button>
              </CardContent>
            </Card>
                
            <Button onClick={handleSaveSettings} className="btn-industrial">
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </Button>
              </>
              )}
              
              {/* User Groups Tab */}
              {settingsTab === 'user-groups' && (
              <>
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
              </>
              )}
              
              {/* Branding Tab */}
              {settingsTab === 'branding' && (
              <>
            <Card>
              <CardHeader>
                <CardTitle>Company Branding</CardTitle>
                <CardDescription>Customize the application appearance for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Company Name"
                      data-testid="input-company-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      This name appears in the header, login page, and throughout the application.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Logo (URL or Base64)</Label>
                    <Input 
                      value={companyLogo} 
                      onChange={(e) => setCompanyLogo(e.target.value)}
                      placeholder="https://example.com/logo.png or paste base64 image"
                      data-testid="input-company-logo"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL to your company logo or paste a base64-encoded image.
                    </p>
                    {companyLogo && (
                      <div className="mt-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                        <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                        <img 
                          src={companyLogo} 
                          alt="Company Logo Preview" 
                          className="h-12 object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Color Scheme</CardTitle>
                <CardDescription>Customize the application colors to match your brand</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-10 rounded border cursor-pointer"
                        data-testid="input-primary-color"
                      />
                      <Input 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-32"
                        placeholder="#1e40af"
                      />
                      <div 
                        className="w-24 h-10 rounded flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Preview
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Main color used for headers, buttons, and navigation.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-12 h-10 rounded border cursor-pointer"
                        data-testid="input-accent-color"
                      />
                      <Input 
                        value={accentColor} 
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-32"
                        placeholder="#3b82f6"
                      />
                      <div 
                        className="w-24 h-10 rounded flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: accentColor }}
                      >
                        Preview
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Secondary color used for links, highlights, and interactive elements.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Terminology</CardTitle>
                <CardDescription>Customize the terms used in the application to match your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Term for "Employee"</Label>
                    <Input 
                      value={termEmployee} 
                      onChange={(e) => setTermEmployee(e.target.value)}
                      placeholder="Employee"
                      data-testid="input-term-employee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Term for "Department"</Label>
                    <Input 
                      value={termDepartment} 
                      onChange={(e) => setTermDepartment(e.target.value)}
                      placeholder="Department"
                      data-testid="input-term-department"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Term for "Clock In"</Label>
                    <Input 
                      value={termClockIn} 
                      onChange={(e) => setTermClockIn(e.target.value)}
                      placeholder="Clock In"
                      data-testid="input-term-clock-in"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Term for "Clock Out"</Label>
                    <Input 
                      value={termClockOut} 
                      onChange={(e) => setTermClockOut(e.target.value)}
                      placeholder="Clock Out"
                      data-testid="input-term-clock-out"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  These terms will be used throughout the application. For example, "Worker" instead of "Employee", or "Section" instead of "Department".
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Button 
                  onClick={async () => {
                    try {
                      await Promise.all([
                        updateSettingMutation.mutateAsync({ key: 'company_name', value: companyName }),
                        updateSettingMutation.mutateAsync({ key: 'company_logo', value: companyLogo }),
                        updateSettingMutation.mutateAsync({ key: 'primary_color', value: primaryColor }),
                        updateSettingMutation.mutateAsync({ key: 'accent_color', value: accentColor }),
                        updateSettingMutation.mutateAsync({ key: 'term_employee', value: termEmployee }),
                        updateSettingMutation.mutateAsync({ key: 'term_department', value: termDepartment }),
                        updateSettingMutation.mutateAsync({ key: 'term_clock_in', value: termClockIn }),
                        updateSettingMutation.mutateAsync({ key: 'term_clock_out', value: termClockOut }),
                      ]);
                      toast({ title: "Branding Settings Saved", description: "Your customizations have been saved. Refresh the page to see changes." });
                    } catch (error) {
                      toast({ variant: "destructive", title: "Error", description: "Failed to save branding settings" });
                    }
                  }}
                  className="w-full"
                  data-testid="button-save-branding"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Branding Settings
                </Button>
              </CardContent>
            </Card>
              </>
              )}
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

        {/* Personnel Termination Dialog */}
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
                <Label className="text-right">Employee</Label>
                <p className="col-span-3 font-medium">
                  {terminationUser?.firstName} {terminationUser?.surname}
                </p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">ID</Label>
                <p className="col-span-3 font-medium">
                  {terminationUser?.id}
                </p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="terminationDateInput" className="text-right">Termination Date</Label>
                <Input 
                  id="terminationDateInput" 
                  type="date"
                  value={terminationDate} 
                  onChange={(e) => setTerminationDate(e.target.value)}
                  className="col-span-3"
                  data-testid="input-termination-date-dialog"
                />
              </div>
              <p className="text-sm text-muted-foreground">
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
                      ...terminationUser,
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">Password {currentUser.userGroupId && !currentUser.password && !isEditing ? '*' : ''}</Label>
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
                <Label htmlFor="positionType" className="text-right">Position Type</Label>
                <div className="col-span-3">
                  <Select 
                    value={currentUser.role || 'worker'} 
                    onValueChange={(value) => setCurrentUser({...currentUser, role: value as 'worker' | 'manager'})}
                  >
                    <SelectTrigger data-testid="select-position-type">
                      <SelectValue placeholder="Select position type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">Worker</SelectItem>
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
                    Select the direct manager for this employee. Only users with "Manager" position type are shown.
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
                    Optional second manager for shared reporting (e.g. worker reports to two department managers).
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="orgPosition" className="text-right">Position</Label>
                <div className="col-span-3">
                  <Select 
                    value={currentUser.orgPositionId ? String(currentUser.orgPositionId) : 'none'} 
                    onValueChange={(value) => setCurrentUser({...currentUser, orgPositionId: value === 'none' ? undefined : Number(value)})}
                  >
                    <SelectTrigger data-testid="select-org-position">
                      <SelectValue placeholder="Select a position (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Position</SelectItem>
                      {orgPositions
                        .sort((a, b) => a.title.localeCompare(b.title))
                        .map((pos) => (
                          <SelectItem key={pos.id} value={String(pos.id)} data-testid={`option-position-${pos.id}`}>
                            {pos.title}{pos.department ? ` (${pos.department})` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    The org chart position for this employee. Positions are defined under Org Positions.
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
                    Whether this employee needs to clock in/out. Disable for contractors, consultants, or off-site workers.
                  </p>
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
                <div className="col-span-3">
                  <Input 
                    id="startDate" 
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formatDateForDisplay(currentUser.startDate)} 
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidDateFormat(value) || value.length <= 10) {
                        setCurrentUser({...currentUser, startDate: parseDateFromDisplay(value)});
                      }
                    }}
                    data-testid="input-start-date"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Format: dd/mm/yyyy</p>
                </div>
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
                          type="text"
                          placeholder="dd/mm/yyyy"
                          value={formatDateForDisplay(currentUser.contractEndDate)} 
                          onChange={(e) => {
                            const value = e.target.value;
                            if (isValidDateFormat(value) || value.length <= 10) {
                              setCurrentUser({...currentUser, contractEndDate: parseDateFromDisplay(value)});
                            }
                          }}
                          data-testid="input-contract-end-date"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Format: dd/mm/yyyy - Required for contract-based personnel.
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
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
                  {isMultiAngleCapture ? (
                    <div className="border rounded-lg p-4 bg-slate-50">
                      <MultiAngleFaceCapture 
                        onComplete={handleMultiAngleCaptureComplete}
                        onCancel={() => setIsMultiAngleCapture(false)}
                      />
                    </div>
                  ) : isCapturingPhoto ? (
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
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setIsCapturingPhoto(true)}
                              disabled={extractingFace}
                            >
                              <Camera className="mr-2 h-4 w-4" /> Quick Retake
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => setIsMultiAngleCapture(true)}
                              disabled={extractingFace}
                            >
                              <Camera className="mr-2 h-4 w-4" /> Multi-Angle
                            </Button>
                          </div>
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
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full border-dashed py-6 bg-green-50 border-green-300 hover:bg-green-100"
                        onClick={() => setIsMultiAngleCapture(true)}
                      >
                        <Camera className="mr-2 h-5 w-5" /> 
                        <div className="text-left">
                          <div className="font-medium">Enhanced Face Registration</div>
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
              const employeeLeaveBalances = leaveBalances.filter((b: LeaveBalance) => b.userId === selectedLeaveRequest.userId);
              const relevantBalance = employeeLeaveBalances.find((b: LeaveBalance) => b.leaveType === selectedLeaveRequest.leaveType);
              const availableDays = relevantBalance ? relevantBalance.total - relevantBalance.taken - relevantBalance.pending : 0;
              
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
                      <Badge variant={formatLeaveStatus(selectedLeaveRequest.status).variant}>
                        {formatLeaveStatus(selectedLeaveRequest.status).label}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Submitted</Label>
                      <p className="font-medium">{format(new Date(selectedLeaveRequest.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <Label className="text-green-800 text-sm font-medium">Employee Leave Balance ({selectedLeaveRequest.leaveType.replace('_', ' ')})</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-muted-foreground text-xs">Total</p>
                        <p className="font-semibold">{relevantBalance?.total || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-muted-foreground text-xs">Taken</p>
                        <p className="font-semibold text-amber-600">{relevantBalance?.taken || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-muted-foreground text-xs">Pending</p>
                        <p className="font-semibold text-blue-600">{relevantBalance?.pending || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-muted-foreground text-xs">Available</p>
                        <p className={`font-semibold ${availableDays > 0 ? 'text-green-600' : 'text-red-600'}`}>{availableDays}</p>
                      </div>
                    </div>
                    {availableDays <= 0 && (
                      <p className="text-red-600 text-xs mt-2 font-medium">Warning: Employee has no available leave for this type!</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-sm">Reason</Label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-lg border">
                      <p>{selectedLeaveRequest.reason || 'No reason provided'}</p>
                    </div>
                  </div>

                  {selectedLeaveRequest.comments && (
                    <div>
                      <Label className="text-muted-foreground text-sm">Additional Comments from Employee</Label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-800">{selectedLeaveRequest.comments}</p>
                      </div>
                    </div>
                  )}

                  {/* Approval History Section */}
                  {(selectedLeaveRequest.managerNotes || selectedLeaveRequest.hrNotes || selectedLeaveRequest.mdNotes) && (
                    <div className="space-y-3">
                      <Label className="text-muted-foreground text-sm">Approval History</Label>
                      
                      {selectedLeaveRequest.managerNotes && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">Manager Review</Badge>
                            <span className="text-xs text-muted-foreground">
                              {selectedLeaveRequest.managerDecision === 'approved' ? '✓ Approved' : '✗ Rejected'}
                              {selectedLeaveRequest.managerDecisionAt && ` on ${format(new Date(selectedLeaveRequest.managerDecisionAt), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                          <p className="text-sm text-purple-800">{selectedLeaveRequest.managerNotes}</p>
                          {selectedLeaveRequest.managerApproverId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              By: {users.find(u => u.id === selectedLeaveRequest.managerApproverId)?.firstName} {users.find(u => u.id === selectedLeaveRequest.managerApproverId)?.surname}
                            </p>
                          )}
                        </div>
                      )}

                      {selectedLeaveRequest.hrNotes && (
                        <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs bg-cyan-100 text-cyan-700 border-cyan-300">HR Review</Badge>
                            <span className="text-xs text-muted-foreground">
                              {selectedLeaveRequest.hrDecision === 'approved' ? '✓ Approved' : '✗ Rejected'}
                              {selectedLeaveRequest.hrDecisionAt && ` on ${format(new Date(selectedLeaveRequest.hrDecisionAt), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                          <p className="text-sm text-cyan-800">{selectedLeaveRequest.hrNotes}</p>
                          {selectedLeaveRequest.hrApproverId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              By: {users.find(u => u.id === selectedLeaveRequest.hrApproverId)?.firstName} {users.find(u => u.id === selectedLeaveRequest.hrApproverId)?.surname}
                            </p>
                          )}
                        </div>
                      )}

                      {selectedLeaveRequest.mdNotes && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">MD Review</Badge>
                            <span className="text-xs text-muted-foreground">
                              {selectedLeaveRequest.mdDecision === 'approved' ? '✓ Approved' : '✗ Rejected'}
                              {selectedLeaveRequest.mdDecisionAt && ` on ${format(new Date(selectedLeaveRequest.mdDecisionAt), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                          <p className="text-sm text-amber-800">{selectedLeaveRequest.mdNotes}</p>
                          {selectedLeaveRequest.mdApproverId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              By: {users.find(u => u.id === selectedLeaveRequest.mdApproverId)?.firstName} {users.find(u => u.id === selectedLeaveRequest.mdApproverId)?.surname}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLeaveRequest.documents && selectedLeaveRequest.documents.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-sm">Supporting Documents</Label>
                      <div className="mt-2 space-y-2">
                        {selectedLeaveRequest.documents.map((doc, index) => {
                          const isPdf = doc.includes('application/pdf') || doc.includes('.pdf');
                          const isImage = doc.includes('image/');
                          
                          const openDocument = () => {
                            if (doc.startsWith('data:')) {
                              const byteString = atob(doc.split(',')[1]);
                              const mimeType = doc.split(',')[0].split(':')[1].split(';')[0];
                              const ab = new ArrayBuffer(byteString.length);
                              const ia = new Uint8Array(ab);
                              for (let i = 0; i < byteString.length; i++) {
                                ia[i] = byteString.charCodeAt(i);
                              }
                              const blob = new Blob([ab], { type: mimeType });
                              const url = URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            } else {
                              window.open(doc, '_blank');
                            }
                          };
                          
                          return (
                            <button 
                              key={index} 
                              onClick={openDocument}
                              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border w-full text-left hover:bg-slate-100 transition-colors"
                            >
                              <FileText className="h-4 w-4 text-blue-500" />
                              <span className="text-blue-600 hover:underline">
                                {isPdf ? `PDF Document ${index + 1}` : isImage ? `Image ${index + 1}` : `Document ${index + 1}`}
                                <span className="text-xs text-muted-foreground ml-2">(Click to view)</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Admin Cancel for completed requests (approved/rejected) */}
                  {['approved', 'rejected'].includes(selectedLeaveRequest.status) && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700 mb-2 font-medium">Admin Cancel</p>
                      <p className="text-xs text-red-600 mb-3">
                        {selectedLeaveRequest.status === 'approved' 
                          ? "Cancelling this approved leave will credit the leave days back to the employee's balance."
                          : "Cancel this rejected request if needed."}
                      </p>
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this leave request?' + 
                            (selectedLeaveRequest.status === 'approved' ? ' The leave days will be credited back to the employee.' : ''))) {
                            adminCancelMutation.mutate({ 
                              id: selectedLeaveRequest.id, 
                              reason: 'Cancelled by admin'
                            });
                          }
                        }}
                        disabled={adminCancelMutation.isPending}
                      >
                        {adminCancelMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</>
                        ) : (
                          <><X className="mr-2 h-4 w-4" /> Cancel Leave Request</>
                        )}
                      </Button>
                    </div>
                  )}

                  {(() => {
                    const actionInfo = canTakeAction(selectedLeaveRequest);
                    if (!actionInfo.canAct) return null;
                    
                    return (
                      <>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                          <p className="text-sm text-blue-800">
                            <strong>Current Stage:</strong> {actionInfo.stage}
                          </p>
                          {actionInfo.role === 'hr' && (
                            <p className="text-xs text-blue-600 mt-1">
                              Note: MD can bypass this stage if needed
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="adminNotes" className="text-sm">
                            Review Comments <span className="text-red-500">*</span>
                          </Label>
                          <p className="text-xs text-muted-foreground mb-1">
                            {actionInfo.role === 'manager' 
                              ? 'Assess workload impact and provide comments for HR/MD review' 
                              : actionInfo.role === 'hr'
                              ? 'Review manager comments and add HR assessment for MD'
                              : 'Review all previous comments and provide final decision notes'}
                          </p>
                          <Textarea
                            id="adminNotes"
                            placeholder={actionInfo.role === 'manager' 
                              ? "Assess workload impact: Can this leave be accommodated? Any concerns for the team?"
                              : actionInfo.role === 'hr'
                              ? "HR assessment: Leave balance verification, policy compliance, any concerns?"
                              : "Final review: Overall assessment considering all previous comments"}
                            className={`mt-1 min-h-[80px] ${!adminNotes.trim() ? 'border-red-300' : ''}`}
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            data-testid="input-admin-notes"
                          />
                          {!adminNotes.trim() && (
                            <p className="text-xs text-red-500 mt-1">Comments are required before making a decision</p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button 
                            variant="outline"
                            disabled={!adminNotes.trim()}
                            onClick={() => {
                              if (!adminNotes.trim()) {
                                toast({ variant: "destructive", title: "Comments Required", description: "Please add comments before rejecting" });
                                return;
                              }
                              if (actionInfo.role === 'manager') {
                                managerDecisionMutation.mutate({ 
                                  id: selectedLeaveRequest.id, 
                                  decision: 'rejected',
                                  notes: adminNotes
                                });
                              } else if (actionInfo.role === 'hr') {
                                hrDecisionMutation.mutate({ 
                                  id: selectedLeaveRequest.id, 
                                  decision: 'rejected',
                                  notes: adminNotes
                                });
                              } else if (actionInfo.role === 'md') {
                                mdDecisionMutation.mutate({ 
                                  id: selectedLeaveRequest.id, 
                                  decision: 'rejected',
                                  notes: adminNotes
                                });
                              }
                            }}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="mr-2 h-4 w-4" /> Reject
                          </Button>
                          <Button 
                            disabled={!adminNotes.trim()}
                            onClick={() => {
                              if (!adminNotes.trim()) {
                                toast({ variant: "destructive", title: "Comments Required", description: "Please add comments before approving" });
                                return;
                              }
                              if (actionInfo.role === 'manager') {
                                managerDecisionMutation.mutate({ 
                                  id: selectedLeaveRequest.id, 
                                  decision: 'approved',
                                  notes: adminNotes
                                });
                              } else if (actionInfo.role === 'hr') {
                                hrDecisionMutation.mutate({ 
                                  id: selectedLeaveRequest.id, 
                                  decision: 'approved',
                                  notes: adminNotes
                                });
                              } else if (actionInfo.role === 'md') {
                                mdDecisionMutation.mutate({ 
                                  id: selectedLeaveRequest.id, 
                                  decision: 'approved',
                                  notes: adminNotes
                                });
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="mr-2 h-4 w-4" /> {actionInfo.role === 'md' ? 'Approve (Final)' : 'Approve & Forward'}
                          </Button>
                          {actionInfo.role === 'md' && selectedLeaveRequest.status === 'pending_hr' && (
                            <Button 
                              disabled={!adminNotes.trim()}
                              onClick={() => {
                                if (!adminNotes.trim()) {
                                  toast({ variant: "destructive", title: "Comments Required", description: "Please add comments before approving" });
                                  return;
                                }
                                mdDecisionMutation.mutate({ 
                                  id: selectedLeaveRequest.id, 
                                  decision: 'approved',
                                  notes: adminNotes,
                                  bypassHR: true
                                });
                              }}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Check className="mr-2 h-4 w-4" /> Bypass HR & Approve
                            </Button>
                          )}
                        </div>
                        
                        {selectedLeaveRequest.status !== 'cancelled' && selectedLeaveRequest.status !== 'rejected' && (
                          <div className="mt-4 pt-4 border-t border-red-200 bg-red-50 -m-4 p-4 rounded-b-lg">
                            <p className="text-sm text-red-700 mb-2 font-medium">Admin Cancel</p>
                            <p className="text-xs text-red-600 mb-3">
                              {selectedLeaveRequest.status === 'approved' 
                                ? "Cancelling this approved leave will credit the leave days back to the employee's balance."
                                : "Cancel this leave request completely."}
                            </p>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this leave request?' + 
                                  (selectedLeaveRequest.status === 'approved' ? ' The leave days will be credited back to the employee.' : ''))) {
                                  adminCancelMutation.mutate({ 
                                    id: selectedLeaveRequest.id, 
                                    reason: adminNotes || 'Cancelled by admin'
                                  });
                                }
                              }}
                              disabled={adminCancelMutation.isPending}
                            >
                              {adminCancelMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</>
                              ) : (
                                <><X className="mr-2 h-4 w-4" /> Cancel Leave Request</>
                              )}
                            </Button>
                          </div>
                        )}
                        
                      </>
                    );
                  })()}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Grievance Review Dialog */}
        <Dialog open={isGrievanceDialogOpen} onOpenChange={setIsGrievanceDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Grievance Details</DialogTitle>
              <DialogDescription>Review and update this employee grievance</DialogDescription>
            </DialogHeader>
            {selectedGrievance && (() => {
              const employee = users.find(u => u.id === selectedGrievance.userId);
              const targetEmployee = selectedGrievance.targetEmployeeId ? users.find(u => u.id === selectedGrievance.targetEmployeeId) : null;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Submitted By</Label>
                      <p className="font-medium">{employee?.firstName} {employee?.surname}</p>
                      <p className="text-xs text-muted-foreground">{employee?.id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Date Submitted</Label>
                      <p className="font-medium">{format(new Date(selectedGrievance.submittedAt), 'MMMM d, yyyy h:mm a')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Target</Label>
                      <p className="font-medium">
                        {selectedGrievance.targetType === 'company' ? 'The Company' : `${targetEmployee?.firstName} ${targetEmployee?.surname}`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Category</Label>
                      <p className="font-medium capitalize">{selectedGrievance.category.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Priority</Label>
                      <Badge className={
                        selectedGrievance.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        selectedGrievance.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        selectedGrievance.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {selectedGrievance.priority}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Status</Label>
                      <Badge className={
                        selectedGrievance.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                        selectedGrievance.status === 'in_review' ? 'bg-blue-100 text-blue-700' :
                        selectedGrievance.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        selectedGrievance.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {selectedGrievance.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-sm">Title</Label>
                    <p className="font-medium">{selectedGrievance.title}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-sm">Description</Label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-lg border whitespace-pre-wrap">
                      {selectedGrievance.description}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grievanceNotes">Admin Notes</Label>
                    <Textarea
                      id="grievanceNotes"
                      placeholder="Add internal notes about this grievance..."
                      value={grievanceNotes}
                      onChange={(e) => setGrievanceNotes(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grievanceResolution">Resolution (if resolved)</Label>
                    <Textarea
                      id="grievanceResolution"
                      placeholder="Describe how this grievance was resolved..."
                      value={grievanceResolution}
                      onChange={(e) => setGrievanceResolution(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="flex justify-between pt-4 border-t">
                    <div className="flex gap-2">
                      {selectedGrievance.status === 'submitted' && (
                        <Button
                          variant="outline"
                          onClick={() => updateGrievanceStatusMutation.mutate({
                            id: selectedGrievance.id,
                            status: 'in_review',
                            adminNotes: grievanceNotes || undefined,
                          })}
                        >
                          Mark In Review
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateGrievanceStatusMutation.mutate({
                          id: selectedGrievance.id,
                          status: 'rejected',
                          adminNotes: grievanceNotes || undefined,
                        })}
                      >
                        <X className="mr-2 h-4 w-4" /> Reject
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateGrievanceStatusMutation.mutate({
                          id: selectedGrievance.id,
                          status: 'resolved',
                          adminNotes: grievanceNotes || undefined,
                          resolution: grievanceResolution || undefined,
                        })}
                      >
                        <Check className="mr-2 h-4 w-4" /> Mark Resolved
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Edit Attendance Dialog */}
        <Dialog open={!!editingAttendance} onOpenChange={(open) => !open && setEditingAttendance(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Attendance Record</DialogTitle>
              <DialogDescription>
                Correct the time or type for this attendance record.
              </DialogDescription>
            </DialogHeader>
            {editingAttendance && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Employee</Label>
                  <p className="font-medium">
                    {(() => {
                      const emp = users.find(u => u.id === editingAttendance.userId);
                      return emp ? `${emp.firstName} ${emp.surname}` : editingAttendance.userId;
                    })()}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editAttendanceDate">Date</Label>
                    <Input
                      id="editAttendanceDate"
                      type="date"
                      value={editAttendanceDate}
                      onChange={(e) => setEditAttendanceDate(e.target.value)}
                      data-testid="input-edit-attendance-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAttendanceTime">Time</Label>
                    <Input
                      id="editAttendanceTime"
                      type="time"
                      value={editAttendanceTime}
                      onChange={(e) => setEditAttendanceTime(e.target.value)}
                      data-testid="input-edit-attendance-time"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editAttendanceType">Type</Label>
                  <Select value={editAttendanceType} onValueChange={(v) => setEditAttendanceType(v as 'in' | 'out')}>
                    <SelectTrigger id="editAttendanceType" data-testid="select-edit-attendance-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Clock In</SelectItem>
                      <SelectItem value="out">Clock Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editInfringementType">Infringement</Label>
                  <Select value={editInfringementType} onValueChange={(v) => setEditInfringementType(v)}>
                    <SelectTrigger id="editInfringementType" data-testid="select-edit-infringement-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Infringement</SelectItem>
                      <SelectItem value="late_arrival">Late Arrival</SelectItem>
                      <SelectItem value="early_departure">Early Departure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editInfringementType !== 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="editInfringementReason">
                      Reason for {editInfringementType === 'late_arrival' ? 'Late Arrival' : 'Early Departure'}
                    </Label>
                    <textarea
                      id="editInfringementReason"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Enter the reason..."
                      value={editInfringementReason}
                      onChange={(e) => setEditInfringementReason(e.target.value)}
                      data-testid="textarea-edit-infringement-reason"
                    />
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingAttendance(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveAttendanceEdit}
                    disabled={updateAttendanceMutation.isPending}
                    data-testid="button-save-attendance-edit"
                  >
                    {updateAttendanceMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </Layout>
  );
}
